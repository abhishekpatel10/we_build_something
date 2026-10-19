import math
from unittest.mock import patch
from urllib.parse import urlparse, parse_qs
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Workspace, File, FileChunk
from core.services import s3_storage_service


class DropboxSystemDesignTestCase(TestCase):
    """
    Test suite for Week 1 & Week 2:
    - Models & Quota Enforcement
    - S3/MinIO Presigned PUT & GET URL Generation
    - POST /api/files/init-upload/
    - PATCH /api/files/<id>/chunks/<index>/complete/ (head_object verification)
    - POST /api/files/<id>/finalize/
    - GET /api/files/<id>/upload-status/
    """

    def setUp(self):
        self.client = APIClient()
        self.workspace = Workspace.objects.create(
            name="Alpha Team Vault",
            slug="alpha-vault",
            owner_id="user_alpha_1",
            storage_quota_bytes=10 * 1024 * 1024 * 1024,  # 10 GB
        )

    # ==========================================================================
    # Week 1 Model & Presigned Tests
    # ==========================================================================

    def test_workspace_quota_and_capacity(self):
        """Test workspace quota calculations and capacity checks."""
        self.assertEqual(self.workspace.available_quota_bytes, 10 * 1024 * 1024 * 1024)
        self.assertTrue(self.workspace.can_accommodate(2 * 1024 * 1024 * 1024))
        self.assertFalse(self.workspace.can_accommodate(15 * 1024 * 1024 * 1024))

    def test_file_chunk_calculation(self):
        """Test automatic calculation of total chunks (5MB chunks)."""
        file_size = 12 * 1024 * 1024  # 12 MB -> 3 chunks
        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="presentation.pptx",
            size_bytes=file_size,
            chunk_size_bytes=5 * 1024 * 1024,
            mime_type="application/vnd.ms-powerpoint",
        )
        self.assertEqual(file_obj.total_chunks, 3)
        self.assertEqual(file_obj.status, File.Status.PENDING)
        self.assertEqual(file_obj.full_path, "/presentation.pptx")

    def test_presigned_put_url_generation(self):
        """Test boto3 presigned PUT URL generation with proper S3 query parameters."""
        s3_key = "workspaces/test/test_file.chunk"
        url = s3_storage_service.generate_presigned_put_url(
            s3_key=s3_key,
            expires_in=1800,
            content_type="application/octet-stream"
        )
        self.assertTrue(url.startswith("http"))
        self.assertIn(s3_key, url)
        self.assertIn(s3_storage_service.bucket_name, url)

        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        self.assertIn('X-Amz-Algorithm', params)
        self.assertEqual(params['X-Amz-Algorithm'][0], 'AWS4-HMAC-SHA256')
        self.assertIn('X-Amz-Signature', params)
        self.assertEqual(params['X-Amz-Expires'][0], '1800')

    def test_presigned_get_url_generation(self):
        """Test boto3 presigned GET URL generation with Content-Disposition header."""
        s3_key = "workspaces/test/test_file.chunk"
        url = s3_storage_service.generate_presigned_get_url(
            s3_key=s3_key,
            expires_in=3600,
            download_filename="downloaded_file.chunk"
        )
        self.assertTrue(url.startswith("http"))
        self.assertIn(s3_key, url)
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        self.assertIn('response-content-disposition', params)
        self.assertIn('downloaded_file.chunk', params['response-content-disposition'][0])

    def test_api_health_check(self):
        """Test /api/health/ endpoint returns valid structure."""
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('components', response.data)
        self.assertIn('database', response.data['components'])
        self.assertIn('minio_s3', response.data['components'])

    # ==========================================================================
    # Week 2 API Tests: init-upload, complete-chunk, finalize
    # ==========================================================================

    def test_init_upload_success(self):
        """Test POST /api/files/init-upload/ generates PENDING file and chunk presigned URLs."""
        url = reverse('file-init-upload')
        payload = {
            'workspace_id': str(self.workspace.id),
            'file_name': 'dataset_2026.tar.gz',
            'folder_path': '/Datasets',
            'size_bytes': 14 * 1024 * 1024,  # 14 MB -> 3 chunks (5MB, 5MB, 4MB)
            'mime_type': 'application/gzip',
            'chunk_size_bytes': 5 * 1024 * 1024,
            'chunk_hashes': ['hash000', 'hash001', 'hash002']
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data

        self.assertEqual(data['file_name'], 'dataset_2026.tar.gz')
        self.assertEqual(data['folder_path'], '/Datasets')
        self.assertEqual(data['status'], 'PENDING')
        self.assertEqual(data['total_chunks'], 3)
        self.assertEqual(len(data['chunks']), 3)

        # Check chunk 0
        chunk0 = data['chunks'][0]
        self.assertEqual(chunk0['chunk_index'], 0)
        self.assertEqual(chunk0['size_bytes'], 5 * 1024 * 1024)
        self.assertEqual(chunk0['chunk_hash'], 'hash000')
        self.assertTrue(chunk0['presigned_put_url'].startswith('http'))

        # Check chunk 2 (remainder 4MB)
        chunk2 = data['chunks'][2]
        self.assertEqual(chunk2['chunk_index'], 2)
        self.assertEqual(chunk2['size_bytes'], 4 * 1024 * 1024)

        # Check DB records
        file_db = File.objects.get(id=data['file_id'])
        self.assertEqual(file_db.chunks.count(), 3)
        self.assertEqual(file_db.status, File.Status.PENDING)

    def test_init_upload_quota_exceeded(self):
        """Test POST /api/files/init-upload/ rejects files exceeding workspace quota."""
        url = reverse('file-init-upload')
        payload = {
            'workspace_id': str(self.workspace.id),
            'file_name': 'massive_archive.iso',
            'size_bytes': 20 * 1024 * 1024 * 1024,  # 20 GB exceeds 10 GB quota
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('quota exceeded', response.data['error'].lower())

    @patch.object(s3_storage_service, 'verify_chunk_exists')
    def test_complete_chunk_verification_failure(self, mock_verify):
        """Test PATCH /api/files/<id>/chunks/<index>/complete/ fails if chunk not in S3."""
        # Mock S3 head_object returning (False, {}) -> chunk missing
        mock_verify.return_value = (False, {})

        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="video.mp4",
            size_bytes=10 * 1024 * 1024,
            chunk_size_bytes=5 * 1024 * 1024,
            total_chunks=2,
            status=File.Status.PENDING,
        )
        chunk_obj = FileChunk.objects.create(
            file=file_obj,
            chunk_index=0,
            size_bytes=5 * 1024 * 1024,
            s3_key="sample/key.part",
            status=FileChunk.Status.PENDING,
        )

        url = reverse('file-chunk-complete', kwargs={'file_id': file_obj.id, 'chunk_index': 0})
        response = self.client.patch(url, {'etag': 'sample-etag'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Verification failed', response.data['error'])

        # DB chunk should remain PENDING
        chunk_obj.refresh_from_db()
        self.assertEqual(chunk_obj.status, FileChunk.Status.PENDING)

    @patch.object(s3_storage_service, 'verify_chunk_exists')
    def test_complete_chunk_verification_success(self, mock_verify):
        """Test PATCH /api/files/<id>/chunks/<index>/complete/ succeeds when chunk exists in S3."""
        mock_verify.return_value = (True, {'etag': 'remote-md5-etag-12345', 'content_length': 5242880})

        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="video.mp4",
            size_bytes=10 * 1024 * 1024,
            chunk_size_bytes=5 * 1024 * 1024,
            total_chunks=2,
            status=File.Status.PENDING,
        )
        chunk_obj = FileChunk.objects.create(
            file=file_obj,
            chunk_index=0,
            size_bytes=5 * 1024 * 1024,
            s3_key="sample/key.part",
            status=FileChunk.Status.PENDING,
        )

        url = reverse('file-chunk-complete', kwargs={'file_id': file_obj.id, 'chunk_index': 0})
        response = self.client.patch(url, {'etag': 'client-etag', 'chunk_hash': 'sha256-fingerprint'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'VERIFIED')
        self.assertEqual(response.data['etag'], 'remote-md5-etag-12345')

        # Chunk should now be VERIFIED
        chunk_obj.refresh_from_db()
        self.assertEqual(chunk_obj.status, FileChunk.Status.VERIFIED)
        self.assertEqual(chunk_obj.chunk_hash, 'sha256-fingerprint')

        # File status should be updated to UPLOADING
        file_obj.refresh_from_db()
        self.assertEqual(file_obj.status, File.Status.UPLOADING)

    def test_finalize_upload_fails_when_chunks_unverified(self):
        """Test POST /api/files/<id>/finalize/ rejects if unverified chunks remain."""
        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="firmware.bin",
            size_bytes=10 * 1024 * 1024,
            chunk_size_bytes=5 * 1024 * 1024,
            total_chunks=2,
            status=File.Status.UPLOADING,
        )
        # Chunk 0 verified, Chunk 1 still pending
        FileChunk.objects.create(file=file_obj, chunk_index=0, size_bytes=5242880, s3_key="k0", status=FileChunk.Status.VERIFIED)
        FileChunk.objects.create(file=file_obj, chunk_index=1, size_bytes=5242880, s3_key="k1", status=FileChunk.Status.PENDING)

        url = reverse('file-finalize', kwargs={'file_id': file_obj.id})
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('missing_chunks', response.data)
        self.assertEqual(response.data['missing_chunks'], [1])

    def test_finalize_upload_succeeds_when_all_chunks_verified(self):
        """Test POST /api/files/<id>/finalize/ sets file ACTIVE and updates workspace storage usage."""
        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="firmware.bin",
            size_bytes=10 * 1024 * 1024,
            chunk_size_bytes=5 * 1024 * 1024,
            total_chunks=2,
            status=File.Status.UPLOADING,
        )
        FileChunk.objects.create(file=file_obj, chunk_index=0, size_bytes=5242880, s3_key="k0", status=FileChunk.Status.VERIFIED)
        FileChunk.objects.create(file=file_obj, chunk_index=1, size_bytes=5242880, s3_key="k1", status=FileChunk.Status.VERIFIED)

        url = reverse('file-finalize', kwargs={'file_id': file_obj.id})
        payload = {'file_hash': 'sha256-full-file-digest-67890'}
        response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_obj.refresh_from_db()
        self.assertEqual(file_obj.status, File.Status.ACTIVE)
        self.assertEqual(file_obj.file_hash, 'sha256-full-file-digest-67890')

        # Workspace usage should be recalculated
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.used_storage_bytes, 10 * 1024 * 1024)

    def test_file_upload_status_endpoint(self):
        """Test GET /api/files/<id>/upload-status/ returns chunk matrix and progress."""
        file_obj = File.objects.create(
            workspace=self.workspace,
            file_name="archive.zip",
            size_bytes=10 * 1024 * 1024,
            chunk_size_bytes=5 * 1024 * 1024,
            total_chunks=2,
            status=File.Status.UPLOADING,
        )
        FileChunk.objects.create(file=file_obj, chunk_index=0, size_bytes=5242880, s3_key="k0", status=FileChunk.Status.VERIFIED)
        FileChunk.objects.create(file=file_obj, chunk_index=1, size_bytes=5242880, s3_key="k1", status=FileChunk.Status.PENDING)

        url = reverse('file-upload-status', kwargs={'file_id': file_obj.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['uploaded_chunks'], 1)
        self.assertEqual(response.data['total_chunks'], 2)
        self.assertEqual(response.data['percentage'], 50.0)
        self.assertFalse(response.data['is_complete'])
        # Pending chunk should have a regenerated presigned PUT URL
        pending_chunk = response.data['chunks'][1]
        self.assertEqual(pending_chunk['status'], 'PENDING')
        self.assertIn('presigned_put_url', pending_chunk)
