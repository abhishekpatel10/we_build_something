import uuid
from django.db import models
from django.utils import timezone
from .file import File


class FileChunk(models.Model):
    """
    Represents an individual chunk of a larger file.
    Follows Dropbox's 5 MB chunking architecture:
    - Enables resumable parallel chunk uploads directly to MinIO/S3.
    - Chunk SHA-256 hashes act as fingerprints for Delta Sync and deduplication.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Presigned URL issued, awaiting upload'
        UPLOADED = 'UPLOADED', 'Client reported uploaded'
        VERIFIED = 'VERIFIED', 'Verified existing in MinIO/S3 via HEAD'
        FAILED = 'FAILED', 'Chunk verification failed'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Globally unique identifier for the chunk."
    )
    file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name='chunks',
        help_text="Parent file to which this chunk belongs."
    )
    chunk_index = models.PositiveIntegerField(
        help_text="0-indexed sequence number of the chunk (0, 1, 2, ...)."
    )
    chunk_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Hex-encoded SHA-256 fingerprint of the chunk contents."
    )
    size_bytes = models.IntegerField(
        help_text="Exact byte size of this chunk."
    )
    s3_key = models.CharField(
        max_length=1024,
        db_index=True,
        help_text="Storage object path in MinIO/S3."
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text="Current state of chunk upload."
    )
    etag = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        help_text="ETag returned by MinIO/S3 upon successful chunk storage."
    )
    uploaded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'file_chunks'
        ordering = ['file', 'chunk_index']
        constraints = [
            models.UniqueConstraint(
                fields=['file', 'chunk_index'],
                name='unique_chunk_per_file'
            )
        ]
        indexes = [
            models.Index(fields=['chunk_hash']),
            models.Index(fields=['status']),
            models.Index(fields=['file', 'status']),
        ]

    def __str__(self):
        return f"{self.file.file_name} [Chunk #{self.chunk_index}] ({self.status})"

    @staticmethod
    def generate_s3_key(workspace_id, file_id, chunk_index: int, chunk_hash: str = None) -> str:
        """
        Generates deterministic S3 key for chunk storage:
        Format: workspaces/{workspace_id}/files/{file_id}/chunk_{chunk_index}_{fingerprint}.part
        """
        fingerprint = chunk_hash[:12] if chunk_hash else 'raw'
        return f"workspaces/{workspace_id}/files/{file_id}/chunk_{chunk_index:05d}_{fingerprint}.part"

    def mark_as_verified(self, etag: str = None):
        """Marks chunk as verified in storage."""
        self.status = self.Status.VERIFIED
        self.etag = etag or self.etag
        self.uploaded_at = timezone.now()
        self.save(update_fields=['status', 'etag', 'uploaded_at', 'updated_at'])
