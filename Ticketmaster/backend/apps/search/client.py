import logging
from django.conf import settings
from elasticsearch import Elasticsearch

import time

logger = logging.getLogger(__name__)

_es_client = None
_es_last_failed = 0

def get_elasticsearch_client():
    """
    Returns a singleton instance of the Elasticsearch client.
    Handles authentication and connection validation gracefully with cooldown.
    """
    global _es_client, _es_last_failed
    if _es_client is not None:
        return _es_client

    now = time.time()
    if now - _es_last_failed < 30:
        return None

    es_host = getattr(settings, 'ELASTICSEARCH_HOST', 'http://127.0.0.1:9200')
    es_user = getattr(settings, 'ELASTICSEARCH_USER', '')
    es_pass = getattr(settings, 'ELASTICSEARCH_PASSWORD', '')

    auth = (es_user, es_pass) if (es_user and es_pass) else None

    try:
        client = Elasticsearch(
            hosts=[es_host],
            basic_auth=auth,
            request_timeout=0.4,
            max_retries=1,
            retry_on_timeout=False
        )
        if client.ping():
            _es_client = client
            logger.info("Connected to Elasticsearch successfully at %s", es_host)
            return _es_client
        else:
            _es_last_failed = now
            return None
    except Exception as e:
        _es_last_failed = now
        logger.warning("Could not connect to Elasticsearch at %s: %s", es_host, e)
        return None
