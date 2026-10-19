from rest_framework import serializers
from core.models import Workspace, File, FileChunk


class WorkspaceSerializer(serializers.ModelSerializer):
    available_quota_bytes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'slug',
            'owner_id',
            'storage_quota_bytes',
            'used_storage_bytes',
            'available_quota_bytes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'used_storage_bytes', 'available_quota_bytes', 'created_at', 'updated_at']


class FileChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileChunk
        fields = [
            'id',
            'file',
            'chunk_index',
            'chunk_hash',
            'size_bytes',
            's3_key',
            'status',
            'etag',
            'uploaded_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'etag', 'uploaded_at', 'created_at', 'updated_at']


class FileSerializer(serializers.ModelSerializer):
    chunks = FileChunkSerializer(many=True, read_only=True)
    uploaded_chunks_count = serializers.IntegerField(read_only=True)
    upload_progress_percentage = serializers.FloatField(read_only=True)
    full_path = serializers.CharField(read_only=True)

    class Meta:
        model = File
        fields = [
            'id',
            'workspace',
            'file_name',
            'folder_path',
            'full_path',
            'mime_type',
            'size_bytes',
            'chunk_size_bytes',
            'total_chunks',
            'status',
            'file_hash',
            'version',
            'uploaded_chunks_count',
            'upload_progress_percentage',
            'chunks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'total_chunks',
            'uploaded_chunks_count',
            'upload_progress_percentage',
            'version',
            'created_at',
            'updated_at'
        ]


class PresignedPutRequestSerializer(serializers.Serializer):
    s3_key = serializers.CharField(max_length=1024, required=True)
    content_type = serializers.CharField(max_length=255, default='application/octet-stream')
    expires_in = serializers.IntegerField(default=3600, min_value=60, max_value=86400)


class PresignedGetRequestSerializer(serializers.Serializer):
    s3_key = serializers.CharField(max_length=1024, required=True)
    download_filename = serializers.CharField(max_length=255, required=False, allow_blank=True)
    expires_in = serializers.IntegerField(default=3600, min_value=60, max_value=86400)


# ==============================================================================
# Week 2: Metadata & Chunk Verification Serializers
# ==============================================================================

class InitUploadRequestSerializer(serializers.Serializer):
    """
    Validates metadata sent by client to initiate a chunked upload session.
    """
    workspace_id = serializers.UUIDField(required=True)
    file_name = serializers.CharField(max_length=255, required=True)
    folder_path = serializers.CharField(max_length=1024, default='/', required=False)
    size_bytes = serializers.IntegerField(min_value=1, max_value=53_687_091_200, required=True)  # Up to 50 GB
    mime_type = serializers.CharField(max_length=255, default='application/octet-stream', required=False)
    chunk_size_bytes = serializers.IntegerField(default=5_242_880, min_value=1_048_576, max_value=104_857_600, required=False)
    chunk_hashes = serializers.ListField(
        child=serializers.CharField(max_length=64),
        required=False,
        default=list,
        help_text="Optional precomputed SHA-256 fingerprints for each chunk."
    )


class ChunkUploadPlanItemSerializer(serializers.Serializer):
    chunk_index = serializers.IntegerField()
    chunk_id = serializers.UUIDField()
    s3_key = serializers.CharField()
    size_bytes = serializers.IntegerField()
    chunk_hash = serializers.CharField(allow_null=True)
    status = serializers.CharField()
    presigned_put_url = serializers.CharField()


class InitUploadResponseSerializer(serializers.Serializer):
    file_id = serializers.UUIDField()
    file_name = serializers.CharField()
    folder_path = serializers.CharField()
    size_bytes = serializers.IntegerField()
    chunk_size_bytes = serializers.IntegerField()
    total_chunks = serializers.IntegerField()
    status = serializers.CharField()
    version = serializers.IntegerField()
    expires_in = serializers.IntegerField()
    chunks = ChunkUploadPlanItemSerializer(many=True)


class CompleteChunkRequestSerializer(serializers.Serializer):
    """
    Payload sent by client after directly uploading a chunk to MinIO S3.
    """
    etag = serializers.CharField(max_length=128, required=False, allow_blank=True, default='')
    chunk_hash = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')


class FinalizeUploadRequestSerializer(serializers.Serializer):
    """
    Payload to finalize the file once all chunks are uploaded and verified.
    """
    file_hash = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
