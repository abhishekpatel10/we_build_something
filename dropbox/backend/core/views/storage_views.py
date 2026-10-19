import math
from django.shortcuts import get_object_or_404
from django.db import connection, transaction
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.models import Workspace, File, FileChunk
from core.serializers import (
    WorkspaceSerializer,
    FileSerializer,
    FileChunkSerializer,
    PresignedPutRequestSerializer,
    PresignedGetRequestSerializer,
    InitUploadRequestSerializer,
    CompleteChunkRequestSerializer,
    FinalizeUploadRequestSerializer,
)
from core.services import s3_storage_service


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for tenant storage Workspaces.
    """
    queryset = Workspace.objects.all()
    serializer_class = WorkspaceSerializer
    lookup_field = 'id'


class FileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view of files and chunks for inspection.
    """
    queryset = File.objects.prefetch_related('chunks').all()
    serializer_class = FileSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = super().get_queryset()
        workspace_id = self.request.query_params.get('workspace_id')
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        folder = self.request.query_params.get('folder')
        if folder:
            qs = qs.filter(folder_path=folder)
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs


@api_view(['GET'])
def health_check_view(request):
    """
    Health check endpoint reporting status of:
    - Django App server
    - Database connection (PostgreSQL/SQLite)
    - MinIO S3 Object Storage connection
    """
    db_ok = False
    db_engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception as e:
        db_err = str(e)

    minio_ok, minio_msg = s3_storage_service.check_connection()

    return Response({
        'status': 'healthy' if (db_ok and minio_ok) else 'degraded',
        'components': {
            'database': {
                'status': 'connected' if db_ok else 'disconnected',
                'engine': db_engine,
            },
            'minio_s3': {
                'status': 'connected' if minio_ok else 'unreachable',
                'endpoint': s3_storage_service.endpoint_url,
                'bucket': s3_storage_service.bucket_name,
                'message': minio_msg,
            },
            'system_defaults': {
                'default_chunk_size_bytes': settings.DEFAULT_CHUNK_SIZE_BYTES,
                'default_chunk_size_mb': settings.DEFAULT_CHUNK_SIZE_BYTES / (1024 * 1024),
                'presigned_url_expiry_seconds': settings.PRESIGNED_URL_EXPIRY_SECONDS,
            }
        }
    })


@api_view(['POST'])
def generate_presigned_put_view(request):
    """
    Generates a presigned PUT URL for direct chunk upload to MinIO.
    """
    serializer = PresignedPutRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        url = s3_storage_service.generate_presigned_put_url(
            s3_key=data['s3_key'],
            expires_in=data.get('expires_in'),
            content_type=data.get('content_type', 'application/octet-stream')
        )
        return Response({
            's3_key': data['s3_key'],
            'presigned_put_url': url,
            'method': 'PUT',
            'expires_in': data.get('expires_in', 3600),
            'bucket': s3_storage_service.bucket_name,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def generate_presigned_get_view(request):
    """
    Generates a presigned GET URL for downloading chunks or files directly from MinIO.
    """
    serializer = PresignedGetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        url = s3_storage_service.generate_presigned_get_url(
            s3_key=data['s3_key'],
            expires_in=data.get('expires_in'),
            download_filename=data.get('download_filename')
        )
        return Response({
            's3_key': data['s3_key'],
            'presigned_get_url': url,
            'method': 'GET',
            'expires_in': data.get('expires_in', 3600),
            'bucket': s3_storage_service.bucket_name,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def verify_chunk_view(request):
    """
    Verifies if a specific chunk exists in MinIO using S3 head_object.
    """
    s3_key = request.data.get('s3_key')
    if not s3_key:
        return Response({'error': 's3_key is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        exists, metadata = s3_storage_service.verify_chunk_exists(s3_key=s3_key)
        return Response({
            's3_key': s3_key,
            'exists': exists,
            'metadata': metadata,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==============================================================================
# Week 2: Metadata & Chunk Verification APIs
# ==============================================================================

@api_view(['POST'])
def init_upload_view(request):
    """
    Week 2 API: POST /api/files/init-upload/
    - Validates file metadata and workspace storage quota.
    - Creates File record with status PENDING.
    - Generates 5MB chunk parts and presigned PUT URLs for each chunk index.
    """
    serializer = InitUploadRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    workspace_id = data['workspace_id']
    file_name = data['file_name']
    folder_path = data.get('folder_path', '/') or '/'
    size_bytes = data['size_bytes']
    mime_type = data.get('mime_type', 'application/octet-stream')
    chunk_size = data.get('chunk_size_bytes', settings.DEFAULT_CHUNK_SIZE_BYTES)
    chunk_hashes = data.get('chunk_hashes', [])

    # Normalize folder path
    if not folder_path.startswith('/'):
        folder_path = '/' + folder_path
    if len(folder_path) > 1 and folder_path.endswith('/'):
        folder_path = folder_path.rstrip('/')

    # Verify workspace & check quota
    workspace = get_object_or_404(Workspace, id=workspace_id)
    if not workspace.can_accommodate(size_bytes):
        return Response({
            'error': f"Storage quota exceeded. Available quota: {workspace.available_quota_bytes} bytes, required: {size_bytes} bytes."
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check for existing active file at same path for versioning
    existing_file = File.objects.filter(
        workspace=workspace,
        folder_path=folder_path,
        file_name=file_name,
        status=File.Status.ACTIVE
    ).order_by('-version').first()

    next_version = (existing_file.version + 1) if existing_file else 1
    total_chunks = math.ceil(size_bytes / chunk_size) if size_bytes > 0 else 1

    with transaction.atomic():
        file_record = File.objects.create(
            workspace=workspace,
            file_name=file_name,
            folder_path=folder_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
            chunk_size_bytes=chunk_size,
            total_chunks=total_chunks,
            status=File.Status.PENDING,
            version=next_version,
        )

        chunk_plan = []
        for i in range(total_chunks):
            remaining_bytes = size_bytes - (i * chunk_size)
            part_size = min(chunk_size, remaining_bytes)
            chunk_hash = chunk_hashes[i] if i < len(chunk_hashes) else None

            s3_key = FileChunk.generate_s3_key(
                workspace_id=workspace.id,
                file_id=file_record.id,
                chunk_index=i,
                chunk_hash=chunk_hash
            )

            chunk_record = FileChunk.objects.create(
                file=file_record,
                chunk_index=i,
                chunk_hash=chunk_hash,
                size_bytes=part_size,
                s3_key=s3_key,
                status=FileChunk.Status.PENDING,
            )

            # Generate presigned PUT URL for direct MinIO upload
            presigned_url = s3_storage_service.generate_presigned_put_url(
                s3_key=s3_key,
                expires_in=settings.PRESIGNED_URL_EXPIRY_SECONDS,
                content_type='application/octet-stream'
            )

            chunk_plan.append({
                'chunk_index': i,
                'chunk_id': chunk_record.id,
                's3_key': s3_key,
                'size_bytes': part_size,
                'chunk_hash': chunk_hash,
                'status': chunk_record.status,
                'presigned_put_url': presigned_url,
            })

    return Response({
        'file_id': file_record.id,
        'file_name': file_record.file_name,
        'folder_path': file_record.folder_path,
        'full_path': file_record.full_path,
        'size_bytes': file_record.size_bytes,
        'chunk_size_bytes': file_record.chunk_size_bytes,
        'total_chunks': file_record.total_chunks,
        'status': file_record.status,
        'version': file_record.version,
        'expires_in': settings.PRESIGNED_URL_EXPIRY_SECONDS,
        'chunks': chunk_plan,
    }, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'POST', 'PUT'])
def complete_chunk_view(request, file_id, chunk_index):
    """
    Week 2 API: PATCH /api/files/<id>/chunks/<index>/complete/
    - Invokes s3.head_object() to verify the chunk actually exists in MinIO/S3.
    - If verified, updates FileChunk status to VERIFIED with ETag and timestamp.
    - Transitions File status to UPLOADING.
    """
    file_record = get_object_or_404(File, id=file_id)
    chunk_record = get_object_or_404(FileChunk, file=file_record, chunk_index=chunk_index)

    # Idempotent check
    if chunk_record.status == FileChunk.Status.VERIFIED:
        return Response({
            'message': f'Chunk #{chunk_index} is already verified.',
            'file_id': str(file_record.id),
            'chunk_index': chunk_index,
            'status': chunk_record.status,
            'etag': chunk_record.etag,
            'uploaded_at': chunk_record.uploaded_at,
            'progress': {
                'uploaded_chunks': file_record.uploaded_chunks_count,
                'total_chunks': file_record.total_chunks,
                'percentage': file_record.upload_progress_percentage,
                'is_complete': file_record.is_complete(),
            }
        }, status=status.HTTP_200_OK)

    # "Trust but Verify": Call s3.head_object()
    exists, metadata = s3_storage_service.verify_chunk_exists(chunk_record.s3_key)
    if not exists:
        err_msg = metadata.get('error') or f'Verification failed: Chunk #{chunk_index} does not exist in MinIO/S3 storage.'
        return Response({
            'error': err_msg,
            's3_key': chunk_record.s3_key,
            'verified': False,
        }, status=status.HTTP_400_BAD_REQUEST)

    # Verification succeeded
    serializer = CompleteChunkRequestSerializer(data=request.data)
    serializer.is_valid()
    etag = metadata.get('etag') or serializer.validated_data.get('etag', '')
    chunk_hash = serializer.validated_data.get('chunk_hash')

    chunk_record.mark_as_verified(etag=etag)
    if chunk_hash and not chunk_record.chunk_hash:
        chunk_record.chunk_hash = chunk_hash
        chunk_record.save(update_fields=['chunk_hash'])

    # Update file status to UPLOADING if PENDING
    if file_record.status == File.Status.PENDING:
        file_record.status = File.Status.UPLOADING
        file_record.save(update_fields=['status', 'updated_at'])

    return Response({
        'message': f'Chunk #{chunk_index} verified successfully via s3.head_object().',
        'file_id': str(file_record.id),
        'chunk_index': chunk_index,
        'status': chunk_record.status,
        'etag': chunk_record.etag,
        'uploaded_at': chunk_record.uploaded_at,
        'progress': {
            'uploaded_chunks': file_record.uploaded_chunks_count,
            'total_chunks': file_record.total_chunks,
            'percentage': file_record.upload_progress_percentage,
            'is_complete': file_record.is_complete(),
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def finalize_upload_view(request, file_id):
    """
    Week 2 API: POST /api/files/<id>/finalize/
    - Checks that all chunks are uploaded and verified.
    - Marks File as ACTIVE.
    - Recalculates workspace storage usage.
    """
    file_record = get_object_or_404(File, id=file_id)

    if file_record.status == File.Status.ACTIVE:
        return Response({
            'message': f"File '{file_record.file_name}' is already active.",
            'file': FileSerializer(file_record).data
        }, status=status.HTTP_200_OK)

    # Check for unverified chunks
    unverified_chunks = file_record.chunks.exclude(status=FileChunk.Status.VERIFIED)
    if unverified_chunks.exists():
        missing_indices = list(unverified_chunks.values_list('chunk_index', flat=True))
        return Response({
            'error': f'Cannot finalize file. {len(missing_indices)} chunk(s) have not been uploaded and verified.',
            'missing_chunks': missing_indices,
            'uploaded_chunks': file_record.uploaded_chunks_count,
            'total_chunks': file_record.total_chunks,
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer = FinalizeUploadRequestSerializer(data=request.data)
    file_hash = None
    if serializer.is_valid() and serializer.validated_data.get('file_hash'):
        file_hash = serializer.validated_data['file_hash']

    # Mark active and update quota with file_hash
    file_record.mark_as_active(file_hash=file_hash)

    return Response({
        'message': f"File '{file_record.file_name}' successfully finalized and marked ACTIVE.",
        'file': FileSerializer(file_record).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def file_upload_status_view(request, file_id):
    """
    Auxiliary Week 2 API: GET /api/files/<id>/upload-status/
    - Reports upload completion status, missing chunks, and fresh presigned PUT URLs for pending chunks.
    - Powers resumable uploads when connection is interrupted.
    """
    file_record = get_object_or_404(File, id=file_id)
    chunks_qs = file_record.chunks.order_by('chunk_index')

    regenerate_urls = request.query_params.get('regenerate_urls', 'true').lower() == 'true'

    chunk_statuses = []
    for c in chunks_qs:
        chunk_info = {
            'chunk_index': c.chunk_index,
            'size_bytes': c.size_bytes,
            's3_key': c.s3_key,
            'status': c.status,
            'etag': c.etag,
            'chunk_hash': c.chunk_hash,
            'uploaded_at': c.uploaded_at,
        }

        # If chunk is still pending and fresh URLs requested, regenerate presigned PUT URL
        if c.status != FileChunk.Status.VERIFIED and regenerate_urls:
            chunk_info['presigned_put_url'] = s3_storage_service.generate_presigned_put_url(
                s3_key=c.s3_key,
                expires_in=settings.PRESIGNED_URL_EXPIRY_SECONDS,
                content_type='application/octet-stream'
            )

        chunk_statuses.append(chunk_info)

    return Response({
        'file_id': str(file_record.id),
        'file_name': file_record.file_name,
        'status': file_record.status,
        'size_bytes': file_record.size_bytes,
        'total_chunks': file_record.total_chunks,
        'uploaded_chunks': file_record.uploaded_chunks_count,
        'percentage': file_record.upload_progress_percentage,
        'is_complete': file_record.is_complete(),
        'chunks': chunk_statuses,
    })
