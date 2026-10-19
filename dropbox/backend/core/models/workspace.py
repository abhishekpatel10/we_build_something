import uuid
from django.db import models


class Workspace(models.Model):
    """
    Represents a tenant or user storage workspace.
    Enforces per-workspace storage quotas and tracks aggregate usage.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Globally unique identifier for the workspace."
    )
    name = models.CharField(
        max_length=255,
        help_text="Human-readable name of the workspace (e.g., 'Personal Vault')."
    )
    slug = models.SlugField(
        max_length=255,
        unique=True,
        help_text="URL-friendly slug for routing."
    )
    owner_id = models.CharField(
        max_length=255,
        default='default-user',
        db_index=True,
        help_text="User/Account identifier owning this workspace."
    )
    storage_quota_bytes = models.BigIntegerField(
        default=53_687_091_200,  # 50 GB
        help_text="Maximum allowed storage capacity in bytes."
    )
    used_storage_bytes = models.BigIntegerField(
        default=0,
        help_text="Current aggregated storage usage in bytes."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.owner_id})"

    @property
    def available_quota_bytes(self) -> int:
        """Returns remaining storage quota in bytes."""
        return max(0, self.storage_quota_bytes - self.used_storage_bytes)

    def can_accommodate(self, file_size_bytes: int) -> bool:
        """Checks if workspace can accommodate the proposed file size."""
        return (self.used_storage_bytes + file_size_bytes) <= self.storage_quota_bytes

    def recalculate_used_storage(self):
        """Recalculates actual used storage from active files."""
        total = self.files.filter(status='ACTIVE').aggregate(
            total_size=models.Sum('size_bytes')
        )['total_size'] or 0
        self.used_storage_bytes = total
        self.save(update_fields=['used_storage_bytes', 'updated_at'])
        return total
