from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    WorkspaceViewSet,
    FileViewSet,
    health_check_view,
    generate_presigned_put_view,
    generate_presigned_get_view,
    verify_chunk_view,
    init_upload_view,
    complete_chunk_view,
    finalize_upload_view,
    file_upload_status_view,
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')
router.register(r'files', FileViewSet, basename='file')

urlpatterns = [
    # Health & S3 Presigned Testing
    path('health/', health_check_view, name='health-check'),
    path('presigned/put/', generate_presigned_put_view, name='presigned-put'),
    path('presigned/get/', generate_presigned_get_view, name='presigned-get'),
    path('presigned/verify/', verify_chunk_view, name='presigned-verify'),

    # Week 2: Metadata & Chunk Verification APIs
    path('files/init-upload/', init_upload_view, name='file-init-upload'),
    path('files/<uuid:file_id>/chunks/<int:chunk_index>/complete/', complete_chunk_view, name='file-chunk-complete'),
    path('files/<uuid:file_id>/finalize/', finalize_upload_view, name='file-finalize'),
    path('files/<uuid:file_id>/upload-status/', file_upload_status_view, name='file-upload-status'),

    # REST ViewSets (Workspaces & Files)
    path('', include(router.urls)),
]
