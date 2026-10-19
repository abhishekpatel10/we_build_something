import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Event
from apps.search.documents import EventDocument

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Event)
def index_event_to_es(sender, instance, **kwargs):
    """
    Phase 4: Synchronization Strategy (CDC / Post-Save Signal)
    Indexes events into Elasticsearch index 'events' whenever created or updated.
    """
    try:
        doc = EventDocument(
            meta={'id': instance.id},
            id=instance.id,
            title=instance.title,
            description=instance.description,
            performer_name=instance.performer.name if instance.performer else '',
            venue_name=instance.venue.name if instance.venue else '',
            city=instance.venue.city if instance.venue else '',
            location={
                'lat': float(instance.venue.latitude) if instance.venue and instance.venue.latitude is not None else 0.0,
                'lon': float(instance.venue.longitude) if instance.venue and instance.venue.longitude is not None else 0.0
            },
            event_date=instance.event_date
        )
        doc.save()
        logger.info("Successfully indexed Event %s to Elasticsearch index 'events'", instance.id)
    except Exception as e:
        logger.error("Error indexing Event %s to Elasticsearch: %s", instance.id, e)


@receiver(post_delete, sender=Event)
def delete_event_from_es(sender, instance, **kwargs):
    """
    Removes event document from Elasticsearch index upon deletion.
    """
    try:
        doc = EventDocument(meta={'id': instance.id}, id=instance.id)
        doc.delete()
        logger.info("Deleted Event %s from Elasticsearch index 'events'", instance.id)
    except Exception as e:
        logger.warning("Error deleting Event %s from Elasticsearch: %s", instance.id, e)
