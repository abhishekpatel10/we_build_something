import json
import logging
import time
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

_redis_client = None
_redis_last_failed = 0
_in_memory_locks = {}  # Resilient fallback if Redis service is not reachable

def get_redis_client():
    """
    Returns configured Redis connection with connection pooling and fast cooldown fallback.
    """
    global _redis_client, _redis_last_failed
    if _redis_client is not None:
        return _redis_client

    now = time.time()
    # If connection recently failed, skip attempt for 30 seconds to avoid multi-second loop stalls
    if now - _redis_last_failed < 30:
        return None

    try:
        redis_url = getattr(settings, 'REDIS_URL', 'redis://127.0.0.1:6379/0')
        client = redis.Redis.from_url(redis_url, socket_timeout=0.3, socket_connect_timeout=0.3, decode_responses=True)
        if client.ping():
            _redis_client = client
            logger.info("Connected to Redis successfully at %s", redis_url)
            return _redis_client
    except Exception as e:
        _redis_last_failed = now
        logger.warning("Redis connection unavailable (%s), using local mutex fallback: %s", getattr(settings, 'REDIS_URL', ''), e)

    return None


def acquire_ticket_lock(ticket_id: str, user_id: str, ttl: int = None) -> bool:
    """
    Step 4: Surge Traffic & Ticket Reservation Lock Strategy
    SET ticket:{ticketId} {userId} NX EX 600 (sets lock only if key does not exist, expires in 10 minutes).
    """
    if ttl is None:
        ttl = getattr(settings, 'RESERVATION_TTL_SECONDS', 600)

    key = f"ticket:{ticket_id}"
    r = get_redis_client()

    if r:
        try:
            # SET NX EX operation is atomic in Redis
            acquired = r.set(key, str(user_id), nx=True, ex=ttl)
            return bool(acquired)
        except Exception as e:
            logger.error("Redis error acquiring lock for ticket %s: %s", ticket_id, e)

    # In-memory fallback
    now = time.time()
    existing = _in_memory_locks.get(key)
    if existing:
        owner, expires_at = existing
        if now < expires_at:
            if owner == str(user_id):
                return True
            return False
    _in_memory_locks[key] = (str(user_id), now + ttl)
    return True


def release_ticket_lock(ticket_id: str, user_id: str = None) -> bool:
    """
    Releases lock safely using Redis Lua script to prevent releasing locks held by other users.
    """
    key = f"ticket:{ticket_id}"
    r = get_redis_client()

    if r:
        try:
            if user_id:
                lua_script = """
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
                """
                result = r.eval(lua_script, 1, key, str(user_id))
                return bool(result)
            else:
                return bool(r.delete(key))
        except Exception as e:
            logger.error("Redis error releasing lock for ticket %s: %s", ticket_id, e)

    # In-memory fallback
    if key in _in_memory_locks:
        owner, expires_at = _in_memory_locks[key]
        if user_id is None or owner == str(user_id):
            del _in_memory_locks[key]
            return True
        return False
    return True


def get_ticket_lock_owner(ticket_id: str) -> str | None:
    """
    Returns the user ID of the lock holder, or None if unlocked or expired.
    """
    key = f"ticket:{ticket_id}"
    r = get_redis_client()

    if r:
        try:
            return r.get(key)
        except Exception as e:
            logger.error("Redis error checking lock for ticket %s: %s", ticket_id, e)

    # In-memory fallback
    existing = _in_memory_locks.get(key)
    if existing:
        owner, expires_at = existing
        if time.time() < expires_at:
            return owner
        else:
            del _in_memory_locks[key]
    return None


def broadcast_seat_update(event_id: str, ticket_id: str, status: str, user_id: str = None):
    """
    Publishes seat status change to Redis Pub/Sub for SSE listeners.
    """
    channel = f"event:{event_id}:seats"
    payload = json.dumps({
        'ticket_id': str(ticket_id),
        'status': status,
        'user_id': str(user_id) if user_id else None,
        'timestamp': int(time.time())
    })

    r = get_redis_client()
    if r:
        try:
            r.publish(channel, payload)
        except Exception as e:
            logger.error("Failed to broadcast seat update via Redis: %s", e)
