import logging
from celery import shared_task
from apps.events.models import Event
from .indexing import index_single_event, sync_all_events

logger = logging.getLogger(__name__)

@shared_task
def sync_event_to_es_task(event_id):
    try:
        event = Event.objects.select_related('venue', 'performer').get(id=event_id)
        index_single_event(event)
        logger.info("Indexed event %s via Celery task", event_id)
    except Event.DoesNotExist:
        logger.warning("Event %s not found for ES sync", event_id)
    except Exception as e:
        logger.error("Error in sync_event_to_es_task: %s", e)

@shared_task
def sync_all_events_to_elasticsearch():
    try:
        count = sync_all_events()
        logger.info("Scheduled bulk sync indexed %s events to ES", count)
        return count
    except Exception as e:
        logger.error("Error in scheduled ES sync: %s", e)
        return 0
