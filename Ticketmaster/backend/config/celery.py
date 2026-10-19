import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('ticketmaster')

# Read config from Django settings, using CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Automatically discover tasks in all installed apps
app.autodiscover_tasks()

# Celery Beat Scheduled Tasks
app.conf.beat_schedule = {
    # Expire abandoned reservations older than TTL (Phase 1 safeguard)
    'cleanup-expired-reservations-every-minute': {
        'task': 'apps.bookings.tasks.cleanup_expired_reservations',
        'schedule': 60.0,
    },
    # Batch release waiting room queue participants
    'process-virtual-waiting-room-every-10-seconds': {
        'task': 'apps.waiting_room.tasks.process_waiting_room_batches',
        'schedule': 10.0,
    },
    # Periodic CDC/Sync to Elasticsearch
    'sync-events-to-elasticsearch-hourly': {
        'task': 'apps.search.tasks.sync_all_events_to_elasticsearch',
        'schedule': crontab(minute=0, hour='*'),
    },
}
