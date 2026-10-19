import logging
from typing import Dict, Any, Tuple, Optional
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, BotoCoreError, EndpointConnectionError
from django.conf import settings

logger = logging.getLogger(__name__)


class S3StorageService:
    """
    Service wrapper for MinIO / AWS S3 interaction using boto3.
    Provides methods to generate presigned PUT/GET URLs, verify chunk
    existence via head_object, and configure S3 bucket CORS for direct browser uploads.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        region_name: Optional[str] = None,
        use_ssl: Optional[bool] = None,
    ):
        self.endpoint_url = endpoint_url or getattr(settings, 'MINIO_ENDPOINT_URL', 'http://127.0.0.1:9000')
        self.access_key = access_key or getattr(settings, 'MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = secret_key or getattr(settings, 'MINIO_SECRET_KEY', 'minioadmin')
        self.bucket_name = bucket_name or getattr(settings, 'MINIO_BUCKET_NAME', 'dropbox-files')
        self.region_name = region_name or getattr(settings, 'MINIO_REGION_NAME', 'us-east-1')
        self.use_ssl = use_ssl if use_ssl is not None else getattr(settings, 'MINIO_USE_SSL', False)

        # MinIO requires path-style addressing ('http://endpoint/bucket/key')
        self.boto_config = Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'},
            retries={'max_attempts': 1, 'mode': 'standard'},
            connect_timeout=1,
            read_timeout=3
        )

        self._client = None

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            self._client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region_name,
                use_ssl=self.use_ssl,
                config=self.boto_config,
            )
        return self._client

    def generate_presigned_put_url(
        self,
        s3_key: str,
        expires_in: Optional[int] = None,
        content_type: str = 'application/octet-stream'
    ) -> str:
        """
        Generates a presigned URL allowing client applications (desktop/web)
        to upload raw chunk bytes directly to MinIO/S3 using an HTTP PUT request.

        :param s3_key: Destination object key in bucket
        :param expires_in: Lifetime of presigned URL in seconds (default: 3600)
        :param content_type: Expected MIME type of the uploaded payload
        :return: Presigned PUT URL string
        """
        expiry = expires_in or getattr(settings, 'PRESIGNED_URL_EXPIRY_SECONDS', 3600)
        params = {
            'Bucket': self.bucket_name,
            'Key': s3_key,
            'ContentType': content_type,
        }

        try:
            url = self.client.generate_presigned_url(
                ClientMethod='put_object',
                Params=params,
                ExpiresIn=expiry,
                HttpMethod='PUT'
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned PUT URL for {s3_key}: {e}")
            raise

    def generate_presigned_get_url(
        self,
        s3_key: str,
        expires_in: Optional[int] = None,
        download_filename: Optional[str] = None
    ) -> str:
        """
        Generates a presigned URL allowing client applications to download
        a file chunk or complete object directly from MinIO/S3 using an HTTP GET request.

        :param s3_key: Object key to download
        :param expires_in: Lifetime of presigned URL in seconds (default: 3600)
        :param download_filename: Optional filename to trigger browser attachment download
        :return: Presigned GET URL string
        """
        expiry = expires_in or getattr(settings, 'PRESIGNED_URL_EXPIRY_SECONDS', 3600)
        params: Dict[str, Any] = {
            'Bucket': self.bucket_name,
            'Key': s3_key,
        }

        if download_filename:
            params['ResponseContentDisposition'] = f'attachment; filename="{download_filename}"'

        try:
            url = self.client.generate_presigned_url(
                ClientMethod='get_object',
                Params=params,
                ExpiresIn=expiry,
                HttpMethod='GET'
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned GET URL for {s3_key}: {e}")
            raise

    def verify_chunk_exists(self, s3_key: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Calls s3.head_object() to verify that the chunk exists remotely in MinIO/S3
        and retrieves its metadata (ETag, ContentLength, LastModified).
        Crucial for 'Trust but Verify' upload pattern without downloading byte payloads.

        :param s3_key: Object key to verify
        :return: Tuple (exists: bool, metadata: dict)
        """
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            metadata = {
                'content_length': response.get('ContentLength'),
                'etag': response.get('ETag', '').strip('"'),
                'last_modified': response.get('LastModified'),
                'content_type': response.get('ContentType'),
            }
            return True, metadata
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchKey', 'NotFound'):
                return False, {}
            logger.error(f"Error checking chunk existence for {s3_key}: {e}")
            raise
        except (EndpointConnectionError, BotoCoreError) as e:
            logger.warning(f"Could not connect to MinIO S3 endpoint for {s3_key}: {e}")
            return False, {'error': f"MinIO S3 service unreachable at {self.endpoint_url}"}

    def delete_object(self, s3_key: str) -> bool:
        """
        Deletes an object or chunk from MinIO/S3.
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError as e:
            logger.error(f"Error deleting object {s3_key}: {e}")
            return False

    def ensure_bucket_exists(self) -> bool:
        """
        Checks if target bucket exists in MinIO; creates it if missing.
        Also configures CORS policies on MinIO to permit cross-origin PUT/GET requests
        from the React frontend.
        """
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"MinIO bucket '{self.bucket_name}' already exists.")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchBucket', 'NotFound'):
                logger.info(f"Creating MinIO bucket '{self.bucket_name}'...")
                self.client.create_bucket(Bucket=self.bucket_name)
            else:
                logger.error(f"Could not verify bucket {self.bucket_name}: {e}")
                raise

        # Setup CORS policy
        self.configure_bucket_cors()
        return True

    def configure_bucket_cors(self):
        """
        Applies CORS rules to allow direct browser uploads (PUT) and downloads (GET)
        with authorization headers, ETags, and chunk hashes.
        """
        cors_configuration = {
            'CORSRules': [
                {
                    'AllowedHeaders': ['*'],
                    'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                    'AllowedOrigins': ['*'],
                    'ExposeHeaders': ['ETag', 'Content-Length', 'x-amz-request-id'],
                    'MaxAgeSeconds': 3600,
                }
            ]
        }
        try:
            self.client.put_bucket_cors(
                Bucket=self.bucket_name,
                CORSConfiguration=cors_configuration
            )
            logger.info(f"Configured CORS rules on bucket '{self.bucket_name}'.")
        except ClientError as e:
            logger.warning(f"Could not configure CORS for bucket '{self.bucket_name}': {e}")

    def check_connection(self) -> Tuple[bool, str]:
        """
        Validates connectivity to MinIO server.
        """
        try:
            self.client.list_buckets()
            return True, "MinIO S3 service connection OK"
        except Exception as e:
            return False, str(e)


# Default singleton instance
s3_storage_service = S3StorageService()
