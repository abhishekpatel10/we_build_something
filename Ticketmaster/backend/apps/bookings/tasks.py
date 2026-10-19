import logging
from celery import shared_task
from apps.bookings.locks import get_redis_client

logger = logging.getLogger(__name__)

@shared_task
def cleanup_expired_reservations():
    """
    Phase 2 Design Decision:
    Because Redis enforces TTL on temporary locks (SET NX EX 600),
    keys expire automatically in in-memory storage without dangling states in PostgreSQL.
    This task logs active lock counts for observability.
    """
    r = get_redis_client()
    if r:
        try:
            keys = r.keys('ticket:*')
            logger.info("Active temporary Redis locks count: %d", len(keys))
            return len(keys)
        except Exception as e:
            logger.error("Error inspecting Redis locks: %s", e)
    return 0
