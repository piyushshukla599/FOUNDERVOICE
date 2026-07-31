"""Simple in-process rate limiting for public-facing endpoints."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

_lock = Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def allow(key: str, *, limit: int, window_sec: float) -> bool:
    """Return True if under limit for this key in the sliding window."""
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window_sec:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True
