from django.contrib import admin
from core.models import Workspace, File, FileChunk


class FileChunkInline(admin.TabularInline):
    model = FileChunk
    extra = 0
    readonly_fields = ('id', 'chunk_index', 'chunk_hash', 'size_bytes', 's3_key', 'status', 'etag', 'uploaded_at')
    can_delete = False


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'owner_id', 'used_storage_bytes', 'storage_quota_bytes', 'created_at')
    search_fields = ('name', 'slug', 'owner_id')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'folder_path', 'workspace', 'size_bytes', 'total_chunks', 'status', 'version', 'updated_at')
    list_filter = ('status', 'workspace')
    search_fields = ('file_name', 'folder_path', 'file_hash')
    readonly_fields = ('id', 'created_at', 'updated_at', 'uploaded_chunks_count', 'upload_progress_percentage')
    inlines = [FileChunkInline]


@admin.register(FileChunk)
class FileChunkAdmin(admin.ModelAdmin):
    list_display = ('file', 'chunk_index', 'status', 'size_bytes', 'etag', 'uploaded_at')
    list_filter = ('status',)
    search_fields = ('file__file_name', 'chunk_hash', 's3_key')
    readonly_fields = ('id', 'created_at', 'updated_at')
