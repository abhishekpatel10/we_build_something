import logging
from django.conf import settings
from elasticsearch_dsl import Document, Text, Keyword, Date, GeoPoint, connections

logger = logging.getLogger(__name__)

# Register default Elasticsearch DSL connection
try:
    es_host = getattr(settings, 'ELASTICSEARCH_HOST', 'http://127.0.0.1:9200')
    connections.create_connection(
        alias='default',
        hosts=[es_host],
        timeout=0.5,
        max_retries=1,
        retry_on_timeout=False
    )
except Exception as e:
    logger.debug("Initial Elasticsearch DSL connection not established: %s", e)


class EventDocument(Document):
    id = Keyword()
    title = Text(analyzer='standard')
    description = Text(analyzer='standard')
    performer_name = Text(fields={'raw': Keyword()})
    venue_name = Text()
    city = Keyword()
    location = GeoPoint()  # lat/lon for distance queries
    event_date = Date()

    class Index:
        name = 'events'

    _in_memory_index = {}

    def save(self, **kwargs):
        """
        Saves document to Elasticsearch cluster index 'events'.
        Maintains an in-memory fallback cache when running offline or in unit tests.
        """
        doc_id = str(getattr(self.meta, 'id', getattr(self, 'id', '')))
        EventDocument._in_memory_index[doc_id] = self.to_dict()
        try:
            return super().save(**kwargs)
        except Exception as e:
            logger.debug("Elasticsearch cluster unavailable, document stored in fallback cache: %s", e)
            return None

    def delete(self, **kwargs):
        """
        Deletes document from Elasticsearch cluster and fallback cache.
        """
        doc_id = str(getattr(self.meta, 'id', getattr(self, 'id', '')))
        EventDocument._in_memory_index.pop(doc_id, None)
        try:
            return super().delete(**kwargs)
        except Exception as e:
            logger.debug("Elasticsearch cluster unavailable during delete: %s", e)
            return None

    @classmethod
    def clear_in_memory_index(cls):
        cls._in_memory_index.clear()

    @classmethod
    def get_in_memory_document(cls, doc_id):
        return cls._in_memory_index.get(str(doc_id))
