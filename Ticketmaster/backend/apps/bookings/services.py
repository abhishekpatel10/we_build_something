import logging
import time
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

RESERVATION_TTL_SECONDS = 600  # 10 minutes

# Global Redis client wrapper with fallback
_redis_client = None
_redis_last_failed = 0
_in_memory_locks = {}

def get_redis_connection():
    global _redis_client, _redis_last_failed
    if _redis_client is not None:
        return _redis_client

    now = time.time()
    if now - _redis_last_failed < 30:
        return None

    try:
        redis_url = getattr(settings, 'REDIS_URL', 'redis://127.0.0.1:6379/0')
        client = redis.Redis.from_url(redis_url, socket_timeout=0.3, socket_connect_timeout=0.3, decode_responses=True)
        if client.ping():
            _redis_client = client
            return _redis_client
    except Exception as e:
        _redis_last_failed = now
        logger.warning("Redis connection unavailable, fallback active: %s", e)

    return None

r = redis.Redis.from_url(getattr(settings, 'REDIS_URL', 'redis://127.0.0.1:6379/0'), decode_responses=True)


def reserve_ticket(ticket_id: int | str, user_id: int | str) -> bool:
    """
    Phase 1: Reservation (POST /api/bookings/reserve/)
    Atomic lock: Only set if key doesn't exist, expires in 10 mins (600s).
    """
    lock_key = f"ticket_lock:{ticket_id}"
    conn = get_redis_connection()

    if conn:
        try:
            # 1. Atomic lock: Only set if key doesn't exist, expire in 10 mins
            is_locked = conn.set(name=lock_key, value=str(user_id), ex=RESERVATION_TTL_SECONDS, nx=True)
            if not is_locked:
                return False  # Already reserved by someone else

            # 2. Publish event to Redis channel for SSE real-time broadcast
            conn.publish("event_seat_updates", f"{ticket_id}:RESERVED")
            return True
        except Exception as e:
            logger.error("Redis reserve error: %s", e)

    # In-memory fallback
    now = time.time()
    if lock_key in _in_memory_locks:
        holder, exp = _in_memory_locks[lock_key]
        if now < exp:
            return False

    _in_memory_locks[lock_key] = (str(user_id), now + RESERVATION_TTL_SECONDS)
    return True


def get_lock_holder(ticket_id: int | str) -> str | None:
    """
    Returns the user id who currently holds the lock, or None if expired/unlocked.
    """
    lock_key = f"ticket_lock:{ticket_id}"
    conn = get_redis_connection()

    if conn:
        try:
            val = conn.get(lock_key)
            return str(val) if val else None
        except Exception as e:
            logger.error("Redis get lock error: %s", e)

    # In-memory fallback
    now = time.time()
    if lock_key in _in_memory_locks:
        holder, exp = _in_memory_locks[lock_key]
        if now < exp:
            return holder
        else:
            del _in_memory_locks[lock_key]

    return None


def release_ticket_lock(ticket_id: int | str):
    """
    Deletes the Redis ticket lock and notifies SSE channel.
    """
    lock_key = f"ticket_lock:{ticket_id}"
    conn = get_redis_connection()

    if conn:
        try:
            conn.delete(lock_key)
            conn.publish("event_seat_updates", f"{ticket_id}:AVAILABLE")
            return True
        except Exception as e:
            logger.error("Redis delete lock error: %s", e)

    if lock_key in _in_memory_locks:
        del _in_memory_locks[lock_key]
    return True


def clear_all_locks():
    """Utility to clear fallback lock registry for test isolations."""
    _in_memory_locks.clear()

