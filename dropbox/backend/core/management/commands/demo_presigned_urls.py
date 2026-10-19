import json
import math
from django.core.management.base import BaseCommand
from core.models import Workspace, File, FileChunk
from core.services import s3_storage_service


class Command(BaseCommand):
    help = "Demonstrates Week 1 Presigned PUT and GET URL generation for MinIO/S3 direct uploads"

    def add_arguments(self, parser):
        parser.add_argument('--file-name', type=str, default='interview_recording.mp4', help='Demo file name')
        parser.add_argument('--file-size-mb', type=int, default=15, help='Demo file size in megabytes')

    def handle(self, *args, **options):
        file_name = options['file_name']
        size_mb = options['file_size_mb']
        size_bytes = size_mb * 1024 * 1024
        chunk_size = 5 * 1024 * 1024  # 5 MB

        self.stdout.write(self.style.SUCCESS("=" * 70))
        self.stdout.write(self.style.SUCCESS("  DROPBOX SYSTEM DESIGN - WEEK 1 DEMO"))
        self.stdout.write(self.style.SUCCESS("  Presigned PUT & GET URL Generator for MinIO S3"))
        self.stdout.write(self.style.SUCCESS("=" * 70))

        # 1. Ensure or create a demo workspace
        workspace, _ = Workspace.objects.get_or_create(
            slug='demo-vault',
            defaults={
                'name': 'Demo User Vault',
                'owner_id': 'user-alex-101',
                'storage_quota_bytes': 50 * 1024 * 1024 * 1024,
            }
        )
        self.stdout.write(f"\n[1] Workspace initialized: {workspace.name} (Quota: {workspace.storage_quota_bytes // (1024**3)} GB)")

        # 2. Register file session in DB
        total_chunks = math.ceil(size_bytes / chunk_size)
        file_record, _ = File.objects.get_or_create(
            workspace=workspace,
            file_name=file_name,
            folder_path='/Recordings',
            defaults={
                'size_bytes': size_bytes,
                'chunk_size_bytes': chunk_size,
                'total_chunks': total_chunks,
                'status': File.Status.PENDING,
                'mime_type': 'video/mp4',
            }
        )
        self.stdout.write(f"[2] File metadata registered: {file_record.full_path}")
        self.stdout.write(f"    Size: {size_mb} MB | Total Chunks (5MB each): {total_chunks}")

        # 3. Generate Chunks and Presigned PUT URLs
        self.stdout.write("\n[3] Generating Presigned PUT URLs for Direct MinIO Upload:")
        self.stdout.write("-" * 70)

        chunk_upload_plan = []
        for i in range(total_chunks):
            # calculate chunk size
            remaining_bytes = size_bytes - (i * chunk_size)
            part_size = min(chunk_size, remaining_bytes)
            s3_key = FileChunk.generate_s3_key(workspace.id, file_record.id, i)

            chunk_obj, _ = FileChunk.objects.get_or_create(
                file=file_record,
                chunk_index=i,
                defaults={
                    'size_bytes': part_size,
                    's3_key': s3_key,
                    'status': FileChunk.Status.PENDING,
                }
            )

            # Generate S3 presigned PUT URL
            put_url = s3_storage_service.generate_presigned_put_url(
                s3_key=s3_key,
                expires_in=3600,
                content_type='application/octet-stream'
            )

            # Generate S3 presigned GET URL
            get_url = s3_storage_service.generate_presigned_get_url(
                s3_key=s3_key,
                expires_in=3600,
                download_filename=f"{file_name}.part{i}"
            )

            chunk_upload_plan.append({
                'chunk_index': i,
                'size_bytes': part_size,
                's3_key': s3_key,
                'put_url': put_url,
                'get_url': get_url,
            })

            self.stdout.write(self.style.WARNING(f"\n-> Chunk #{i} ({part_size // (1024*1024)} MB):"))
            self.stdout.write(f"   S3 Key:  {s3_key}")
            self.stdout.write(f"   PUT URL: {put_url[:80]}... [truncated]")
            self.stdout.write(f"   GET URL: {get_url[:80]}... [truncated]")

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("[4] Example Client cURL Command to Upload Chunk #0 directly to MinIO:"))
        sample = chunk_upload_plan[0]
        curl_cmd = (
            f'curl -X PUT "{sample["put_url"]}" \\\n'
            f'     -H "Content-Type: application/octet-stream" \\\n'
            f'     --data-binary "@/path/to/local/chunk_0.part"'
        )
        self.stdout.write(curl_cmd)
        self.stdout.write("=" * 70 + "\n")
