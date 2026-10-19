import math
import uuid
from django.db import models
from django.utils import timezone
from .workspace import Workspace


class File(models.Model):
    """
    Represents a file metadata record in the Dropbox system.
    Supports large files (up to 50 GB) split into chunked records.
    Raw bytes reside in MinIO/S3; metadata resides in PostgreSQL/SQLite.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Upload Initiation'
        UPLOADING = 'UPLOADING', 'Chunk Upload In Progress'
        ACTIVE = 'ACTIVE', 'Active and Fully Synced'
        FAILED = 'FAILED', 'Upload / Verification Failed'
        DELETED = 'DELETED', 'Soft-deleted / Tombstone'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Globally unique identifier for the file."
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='files',
        help_text="Workspace this file belongs to."
    )
    file_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Name of the file including extension (e.g., 'dataset.zip')."
    )
    folder_path = models.CharField(
        max_length=1024,
        default='/',
        db_index=True,
        help_text="Virtual folder path hierarchy (e.g., '/Documents/Research')."
    )
    mime_type = models.CharField(
        max_length=255,
        default='application/octet-stream',
        help_text="MIME type of the file."
    )
    size_bytes = models.BigIntegerField(
        help_text="Total file size in bytes (supports up to 50 GB)."
    )
    chunk_size_bytes = models.IntegerField(
        default=5_242_880,  # 5 MB standard chunk
        help_text="Chunk size in bytes used to partition the file."
    )
    total_chunks = models.IntegerField(
        help_text="Total number of chunks required for this file."
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        help_text="Current lifecycle status of the file."
    )
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Hex-encoded SHA-256 fingerprint of the entire file."
    )
    version = models.PositiveIntegerField(
        default=1,
        help_text="Version counter for delta sync & conflict resolution."
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'files'
        ordering = ['folder_path', 'file_name', '-version']
        indexes = [
            models.Index(fields=['workspace', 'folder_path', 'file_name']),
            models.Index(fields=['workspace', 'status']),
            models.Index(fields=['workspace', 'updated_at']),
        ]

    def __str__(self):
        return f"{self.folder_path.rstrip('/')}/{self.file_name} (v{self.version}) [{self.status}]"

    @property
    def full_path(self) -> str:
        """Returns normalized full path including filename."""
        base = self.folder_path.rstrip('/')
        return f"{base}/{self.file_name}" if base else f"/{self.file_name}"

    def save(self, *args, **kwargs):
        """Automatically calculates total_chunks if not provided."""
        if not self.total_chunks and self.size_bytes is not None:
            if self.size_bytes == 0:
                self.total_chunks = 1
            else:
                self.total_chunks = math.ceil(self.size_bytes / self.chunk_size_bytes)
        super().save(*args, **kwargs)

    @property
    def uploaded_chunks_count(self) -> int:
        """Returns number of chunks verified/uploaded."""
        return self.chunks.filter(status='VERIFIED').count()

    @property
    def upload_progress_percentage(self) -> float:
        """Returns percentage of chunks successfully uploaded."""
        if not self.total_chunks:
            return 0.0
        return round((self.uploaded_chunks_count / self.total_chunks) * 100, 2)

    def is_complete(self) -> bool:
        """Returns True if all required chunks have been verified."""
        return self.uploaded_chunks_count >= self.total_chunks

    def mark_as_active(self, file_hash: str = None):
        """Marks the file as ACTIVE, sets optional hash, and triggers workspace usage recalculation."""
        self.status = self.Status.ACTIVE
        fields = ['status', 'updated_at']
        if file_hash:
            self.file_hash = file_hash
            fields.append('file_hash')
        elif self.file_hash:
            fields.append('file_hash')
        self.save(update_fields=fields)
        self.workspace.recalculate_used_storage()

    def mark_as_deleted(self):
        """Soft-deletes the file."""
        self.status = self.Status.DELETED
        self.deleted_at = timezone.now()
        self.save(update_fields=['status', 'deleted_at', 'updated_at'])
        self.workspace.recalculate_used_storage()
