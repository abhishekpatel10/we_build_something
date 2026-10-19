import logging
from elasticsearch.helpers import bulk
from .client import get_elasticsearch_client
from apps.events.models import Event

logger = logging.getLogger(__name__)

INDEX_NAME = 'events'

INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "event_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding"]
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "title": {
                "type": "text",
                "analyzer": "standard"
            },
            "description": {
                "type": "text",
                "analyzer": "standard"
            },
            "performer_name": {
                "type": "text",
                "fields": {
                    "raw": {"type": "keyword"}
                }
            },
            "venue_name": {"type": "text"},
            "city": {"type": "keyword"},
            "location": {"type": "geo_point"},
            "event_date": {"type": "date"},
            # Aliases for frontend and backward compatibility
            "name": {
                "type": "text",
                "analyzer": "event_analyzer",
                "fields": {
                    "raw": {"type": "keyword"}
                }
            },
            "category": {"type": "keyword"},
            "date": {"type": "date"},
            "status": {"type": "keyword"},
            "banner_image": {"type": "keyword", "index": False},
            "surge_mode_active": {"type": "boolean"},
            "performer": {
                "properties": {
                    "id": {"type": "keyword"},
                    "name": {"type": "text", "analyzer": "event_analyzer"},
                    "genre": {"type": "keyword"},
                    "avatar_url": {"type": "keyword", "index": False}
                }
            },
            "venue": {
                "properties": {
                    "id": {"type": "keyword"},
                    "name": {"type": "text", "analyzer": "event_analyzer"},
                    "city": {"type": "keyword"},
                    "state": {"type": "keyword"},
                    "country": {"type": "keyword"},
                    "coordinates": {"type": "geo_point"}
                }
            },
            "min_price": {"type": "float"},
            "available_tickets": {"type": "integer"}
        }
    }
}


def ensure_index_exists():
    client = get_elasticsearch_client()
    if not client:
        return False
    try:
        if not client.indices.exists(index=INDEX_NAME):
            client.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
            logger.info("Created Elasticsearch index: %s", INDEX_NAME)
        return True
    except Exception as e:
        logger.error("Error creating Elasticsearch index: %s", e)
        return False


def event_to_es_document(event: Event) -> dict:
    from apps.bookings.models import Ticket
    cheapest = event.tickets.filter(status=Ticket.Status.AVAILABLE).order_by('price').first()
    avail_count = event.tickets.filter(status=Ticket.Status.AVAILABLE).count()

    lat = float(event.venue.latitude) if (event.venue and event.venue.latitude is not None) else 0.0
    lon = float(event.venue.longitude) if (event.venue and event.venue.longitude is not None) else 0.0

    return {
        "_index": INDEX_NAME,
        "_id": str(event.id),
        "_source": {
            "id": str(event.id),
            "title": event.title,
            "description": event.description,
            "performer_name": event.performer.name if event.performer else '',
            "venue_name": event.venue.name if event.venue else '',
            "city": event.venue.city if event.venue else '',
            "location": {
                "lat": lat,
                "lon": lon
            },
            "event_date": event.event_date.isoformat(),
            # Aliases
            "name": event.title,
            "category": event.category,
            "date": event.event_date.isoformat(),
            "status": "open_for_booking",
            "banner_image": event.banner_image,
            "surge_mode_active": event.is_surge_protected,
            "performer": {
                "id": str(event.performer.id) if event.performer else '',
                "name": event.performer.name if event.performer else '',
                "genre": getattr(event.performer, 'genre', '') if event.performer else '',
                "avatar_url": getattr(event.performer, 'avatar_url', '') if event.performer else ''
            },
            "venue": {
                "id": str(event.venue.id) if event.venue else '',
                "name": event.venue.name if event.venue else '',
                "city": event.venue.city if event.venue else '',
                "state": getattr(event.venue, 'state', ''),
                "country": getattr(event.venue, 'country', ''),
                "coordinates": {
                    "lat": lat,
                    "lon": lon
                }
            },
            "min_price": float(cheapest.price) if cheapest else 0.0,
            "available_tickets": avail_count
        }
    }


def index_single_event(event: Event):
    client = get_elasticsearch_client()
    if not client or not ensure_index_exists():
        return False
    try:
        doc = event_to_es_document(event)
        client.index(index=INDEX_NAME, id=doc["_id"], document=doc["_source"])
        return True
    except Exception as e:
        logger.error("Failed indexing event %s: %s", event.id, e)
        return False


def sync_all_events():
    client = get_elasticsearch_client()
    if not client or not ensure_index_exists():
        return False

    events = Event.objects.select_related('venue', 'performer').prefetch_related('tickets').all()
    actions = [event_to_es_document(ev) for ev in events]

    if actions:
        success, failed = bulk(client, actions, refresh=True)
        logger.info("Bulk indexed %d events into Elasticsearch (failed: %d)", success, len(failed) if isinstance(failed, list) else 0)
        return success
    return 0
