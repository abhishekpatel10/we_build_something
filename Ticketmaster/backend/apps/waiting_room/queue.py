import logging
import time
import uuid
from apps.bookings.locks import get_redis_client

logger = logging.getLogger(__name__)

# In-memory fallback structures for local environment without active Redis
_in_memory_queue = {}       # event_id -> list of (user_id, timestamp)
_in_memory_tokens = {}      # f"{user_id}:{event_id}" -> expiry_time

def enqueue_user(event_id: str, user_id: str) -> dict:
    """
    Adds user to the virtual waiting room for an event.
    Redis Sorted Set (ZSET) with score = timestamp.
    """
    queue_key = f"queue:event:{event_id}"
    token_key = f"token:admitted:{user_id}:{event_id}"
    r = get_redis_client()
    now = time.time()

    if r:
        try:
            # Check if user already admitted
            if r.exists(token_key):
                ttl = r.ttl(token_key)
                return {
                    'admitted': True,
                    'position': 0,
                    'estimated_wait_seconds': 0,
                    'token_ttl': max(0, ttl)
                }

            # Add to ZSET if not already present
            r.zadd(queue_key, {str(user_id): now}, nx=True)
            rank = r.zrank(queue_key, str(user_id))
            total = r.zcard(queue_key)
            position = (rank + 1) if rank is not None else 1
            estimated_wait = position * 3  # Roughly 3 seconds per person batching rate

            return {
                'admitted': False,
                'position': position,
                'total_queued': total,
                'estimated_wait_seconds': estimated_wait
            }
        except Exception as e:
            logger.error("Redis error enqueuing user: %s", e)

    # In-memory fallback
    token_id = f"{user_id}:{event_id}"
    if token_id in _in_memory_tokens and _in_memory_tokens[token_id] > now:
        return {'admitted': True, 'position': 0, 'estimated_wait_seconds': 0, 'token_ttl': int(_in_memory_tokens[token_id] - now)}

    if event_id not in _in_memory_queue:
        _in_memory_queue[event_id] = []

    q = _in_memory_queue[event_id]
    existing_idx = next((i for i, (u, _) in enumerate(q) if u == str(user_id)), None)
    if existing_idx is None:
        q.append((str(user_id), now))
        position = len(q)
    else:
        position = existing_idx + 1

    return {
        'admitted': False,
        'position': position,
        'total_queued': len(q),
        'estimated_wait_seconds': position * 3
    }


def get_queue_status(event_id: str, user_id: str) -> dict:
    """
    Checks user's current status and position in the virtual queue.
    """
    queue_key = f"queue:event:{event_id}"
    token_key = f"token:admitted:{user_id}:{event_id}"
    r = get_redis_client()
    now = time.time()

    if r:
        try:
            if r.exists(token_key):
                ttl = r.ttl(token_key)
                return {
                    'admitted': True,
                    'position': 0,
                    'total_queued': r.zcard(queue_key),
                    'estimated_wait_seconds': 0,
                    'token_ttl': max(0, ttl)
                }

            rank = r.zrank(queue_key, str(user_id))
            total = r.zcard(queue_key)

            if rank is None:
                # Not currently in queue, add them
                return enqueue_user(event_id, user_id)

            position = rank + 1
            estimated_wait = max(5, position * 3)

            return {
                'admitted': False,
                'position': position,
                'total_queued': total,
                'estimated_wait_seconds': estimated_wait
            }
        except Exception as e:
            logger.error("Redis error checking queue status: %s", e)

    # Fallback
    token_id = f"{user_id}:{event_id}"
    if token_id in _in_memory_tokens and _in_memory_tokens[token_id] > now:
        return {'admitted': True, 'position': 0, 'total_queued': len(_in_memory_queue.get(event_id, [])), 'estimated_wait_seconds': 0, 'token_ttl': int(_in_memory_tokens[token_id] - now)}

    q = _in_memory_queue.get(event_id, [])
    existing_idx = next((i for i, (u, _) in enumerate(q) if u == str(user_id)), None)
    if existing_idx is None:
        return enqueue_user(event_id, user_id)

    position = existing_idx + 1
    return {
        'admitted': False,
        'position': position,
        'total_queued': len(q),
        'estimated_wait_seconds': max(5, position * 3)
    }


def admit_batch(event_id: str, batch_size: int = 200, validity_seconds: int = 900) -> list:
    """
    Releases top N users from the queue into the booking pipeline.
    Grants an admission token with a 15-minute TTL.
    """
    queue_key = f"queue:event:{event_id}"
    r = get_redis_client()
    admitted_users = []
    now = time.time()

    if r:
        try:
            users = r.zrange(queue_key, 0, batch_size - 1)
            for u in users:
                token_key = f"token:admitted:{u}:{event_id}"
                r.set(token_key, "admitted", ex=validity_seconds)
                r.zrem(queue_key, u)
                admitted_users.append(u)
            logger.info("Admitted batch of %d users for event %s", len(admitted_users), event_id)
            return admitted_users
        except Exception as e:
            logger.error("Redis error admitting batch: %s", e)

    # Fallback
    q = _in_memory_queue.get(event_id, [])
    batch = q[:batch_size]
    _in_memory_queue[event_id] = q[batch_size:]

    for (u, _) in batch:
        _in_memory_tokens[f"{u}:{event_id}"] = now + validity_seconds
        admitted_users.append(u)

    return admitted_users


def is_user_admitted(event_id: str, user_id: str) -> bool:
    """
    Returns True if user holds an active admission token or queue is not enforced.
    """
    token_key = f"token:admitted:{user_id}:{event_id}"
    r = get_redis_client()

    if r:
        try:
            return bool(r.exists(token_key))
        except Exception as e:
            logger.error("Redis error checking admission: %s", e)

    # Fallback
    token_id = f"{user_id}:{event_id}"
    return token_id in _in_memory_tokens and _in_memory_tokens[token_id] > time.time()


def leave_queue(event_id: str, user_id: str):
    """
    Removes user from waiting room.
    """
    queue_key = f"queue:event:{event_id}"
    r = get_redis_client()
    if r:
        try:
            r.zrem(queue_key, str(user_id))
            return True
        except Exception:
            pass

    q = _in_memory_queue.get(event_id, [])
    _in_memory_queue[event_id] = [(u, t) for (u, t) in q if u != str(user_id)]
    return True
