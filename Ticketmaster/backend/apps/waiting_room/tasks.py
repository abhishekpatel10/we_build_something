import logging
from celery import shared_task
from apps.events.models import Event
from .queue import admit_batch

logger = logging.getLogger(__name__)

@shared_task
def process_waiting_room_batches():
    """
    Step 4: Virtual Waiting Queue (Choke Point)
    When seats free up or backend capacity allows, permit batches of users (e.g. 200 users at a time)
    to leave the queue and proceed to the seat map and booking pipeline.
    """
    surge_events = Event.objects.filter(is_surge_protected=True)
    total_admitted = 0

    for event in surge_events:
        admitted = admit_batch(str(event.id), batch_size=50, validity_seconds=900)
        total_admitted += len(admitted)

    if total_admitted > 0:
        logger.info("Admitted total %d waiting users across surge events.", total_admitted)
    return total_admitted
