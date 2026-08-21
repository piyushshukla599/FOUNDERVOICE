"""Per-client free-tier quotas.

The expensive paths in this product are transcription (a resident Whisper model
plus real CPU seconds) and the DeepSeek-backed practice chat. On a free hosted
tier those have to be capped, or one visitor can exhaust the box for everyone.

Design notes, because the details are what make a limit hold:

* **The bucket is derived server-side.** Client-supplied headers are ignored
  unless an operator has explicitly named a trusted proxy header, because any
  caller can send ``X-Forwarded-For: 1.2.3.4`` and mint a fresh identity per
  request. Behind Cloudflare, ``CF-Connecting-IP`` is written by the edge and
  cannot be forged by the visitor.
* **IPv6 collapses to its /64.** A residential IPv6 customer is handed an entire
  /64 (or wider) and can pick a new address per request at will, so counting
  single addresses would be a limit in name only.
* **Counting is atomic.** ``BEGIN IMMEDIATE`` takes SQLite's write lock before
  the read, so N concurrent uploads cannot all observe ``used = 4`` and each
  decide they are the fifth.
* **Raw addresses are never stored.** Buckets are HMAC-SHA256 digests under a
  server-held secret, so the database holds no visitor IPs.

A determined person with a VPN can still rotate networks. That is inherent to
anonymous free access — the fix is accounts, not a cleverer hash — but this
stops casual reuse, incognito tabs, and scripted abuse from one host.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request

from ..config import get_settings
from ..db import connect, utc_now

logger = logging.getLogger(__name__)

# feature -> settings attribute holding its limit
FEATURES = {
    "upload": "free_upload_limit",
    "practice": "free_practice_limit",
    "practice_turn": "free_practice_turn_limit",
}

# Shown to the client so the UI can name the thing that ran out.
FEATURE_LABELS = {
    "upload": "recordings",
    "practice": "practice rounds",
    "practice_turn": "practice replies",
}

_SECRET: str | None = None


def _secret() -> str:
    """The HMAC key. Configured in production; ephemeral per process otherwise.

    An ephemeral key means quotas reset on restart, which is the right failure
    mode for local development and the wrong one for a deploy — so a missing
    QUOTA_SECRET is logged loudly rather than silently tolerated.
    """
    global _SECRET
    if _SECRET is None:
        configured = (get_settings().quota_secret or "").strip()
        if configured:
            _SECRET = configured
        else:
            _SECRET = secrets.token_hex(32)
            logger.warning(
                "QUOTA_SECRET is not set - free-tier counters reset on restart. "
                "Set it in .env before deploying."
            )
    return _SECRET


def _normalize(raw: str) -> str | None:
    """One stable identity per household, or None when the address is unusable."""
    try:
        ip = ipaddress.ip_address(raw.strip())
    except ValueError:
        return None
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            return str(ip.ipv4_mapped)
        # A single customer owns the whole /64 - count it as one.
        network = ipaddress.ip_network(f"{ip}/64", strict=False)
        return f"{network.network_address}/64"
    return str(ip)


def client_ip(request: Request) -> tuple[str | None, bool]:
    """The visitor's address and whether it came from a header.

    Returns ``(address, from_header)``. When a trusted proxy header is
    configured the socket peer is the proxy itself, so the header is the only
    meaningful identity - and a request that somehow arrives without it must
    not fall back to the peer, or every caller would look like the loopback
    proxy and be exempt.
    """
    settings = get_settings()
    header = (settings.trusted_proxy_header or "").strip().lower()
    if header:
        value = request.headers.get(header, "")
        if value:
            # X-Forwarded-For is a chain; the client's own address is leftmost.
            first = value.split(",")[0].strip()
            normalized = _normalize(first)
            if normalized:
                return normalized, True
        # Configured but missing or unparseable: count it, do not exempt it.
        return None, True
    if request.client and request.client.host:
        return _normalize(request.client.host), False
    return None, False


def is_exempt(ip: str | None, *, from_header: bool = False) -> bool:
    """Loopback and LAN callers are the operator, not the public.

    Never granted on an address that arrived in a header. Whether a forged
    ``X-Forwarded-For: 127.0.0.1`` reaches this code depends on whether the
    proxy replaces the header or appends to it - Caddy replaces, so today it
    does not. That is the proxy's behaviour protecting us, not ours, and it
    changes the moment someone edits the Caddyfile or puts a different proxy
    in front. Exemption is a decision about the *socket*, so require one.
    """
    if from_header:
        return False
    if not get_settings().quota_exempt_private:
        return False
    if not ip:
        return False
    try:
        addr = ipaddress.ip_address(ip.split("/")[0])
    except ValueError:
        return False
    return addr.is_loopback or addr.is_private or addr.is_link_local


def bucket_for(request: Request) -> str | None:
    """A hashed, non-reversible identity - or None when this caller is exempt."""
    ip, from_header = client_ip(request)
    if is_exempt(ip, from_header=from_header):
        return None
    if ip is None:
        if not from_header:
            # No proxy configured and no peer address: nothing to meter.
            return None
        # Behind a proxy with no usable address. Share one bucket so these
        # requests are still capped rather than unlimited.
        ip = "unattributable"
    digest = hmac.new(_secret().encode("utf-8"), ip.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


def limit_for(feature: str) -> int:
    attr = FEATURES.get(feature)
    if not attr:
        return 0
    return int(getattr(get_settings(), attr, 0) or 0)


def _window() -> timedelta:
    return timedelta(hours=max(1, int(get_settings().quota_window_hours or 24)))


def _parse(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        parsed = datetime.fromisoformat(ts)
    except ValueError:
        return None
    # Rows written before the window existed may lack an offset.
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _window_state(row: Any, now: datetime) -> tuple[int, datetime]:
    """Usage in the current window, and when that window opened.

    A window that has run out is reported as zero used and starting now, so an
    expired counter reads as a fresh allowance without needing a sweep job.
    """
    if row is None:
        return 0, now
    started = _parse(row["window_started"] if "window_started" in row.keys() else None)
    if started is None or now - started >= _window():
        return 0, now
    return int(row["used"] or 0), started


@dataclass
class QuotaState:
    feature: str
    used: int
    limit: int
    unlimited: bool = False
    window_started: datetime | None = None

    @property
    def remaining(self) -> int:
        if self.unlimited:
            return -1
        return max(0, self.limit - self.used)

    @property
    def exhausted(self) -> bool:
        return not self.unlimited and self.used >= self.limit

    @property
    def resets_at(self) -> datetime | None:
        if self.unlimited or self.window_started is None:
            return None
        return self.window_started + _window()

    def as_dict(self) -> dict[str, Any]:
        resets_at = self.resets_at
        seconds = None
        if resets_at is not None:
            seconds = max(0, int((resets_at - datetime.now(timezone.utc)).total_seconds()))
        return {
            "feature": self.feature,
            "resets_at": resets_at.isoformat() if resets_at else None,
            "resets_in_seconds": seconds,
            "window_hours": int(get_settings().quota_window_hours or 24),
            "label": FEATURE_LABELS.get(self.feature, self.feature),
            "used": self.used,
            "limit": -1 if self.unlimited else self.limit,
            "remaining": self.remaining,
            "unlimited": self.unlimited,
            "exhausted": self.exhausted,
        }


def _unlimited(feature: str) -> QuotaState:
    return QuotaState(feature=feature, used=0, limit=-1, unlimited=True)


def peek(request: Request, feature: str) -> QuotaState:
    """What is left, without spending anything."""
    settings = get_settings()
    if not settings.quota_enabled:
        return _unlimited(feature)
    bucket = bucket_for(request)
    if bucket is None:
        return _unlimited(feature)
    now = datetime.now(timezone.utc)
    with connect() as conn:
        row = conn.execute(
            "SELECT used, window_started FROM usage_quota WHERE bucket=? AND feature=?",
            (bucket, feature),
        ).fetchone()
    used, started = _window_state(row, now)
    return QuotaState(
        feature=feature, used=used, limit=limit_for(feature), window_started=started
    )


def snapshot(request: Request) -> dict[str, Any]:
    """Every counter for this caller - what the web app renders its gate from."""
    return {f: peek(request, f).as_dict() for f in FEATURES}


class QuotaExceeded(HTTPException):
    """402: the free allowance is spent. Distinct from 429, which means slow down."""

    def __init__(self, state: QuotaState):
        label = FEATURE_LABELS.get(state.feature, state.feature)
        super().__init__(
            status_code=402,
            detail={
                "error": "free_limit_reached",
                "message": f"You have used all {state.limit} free {label}.",
                "quota": state.as_dict(),
            },
        )
        self.state = state


def consume(request: Request, feature: str, *, cost: int = 1) -> QuotaState:
    """Spend one unit, or raise QuotaExceeded. Atomic against concurrent callers."""
    settings = get_settings()
    if not settings.quota_enabled:
        return _unlimited(feature)
    bucket = bucket_for(request)
    if bucket is None:
        return _unlimited(feature)

    limit = limit_for(feature)
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()
    with connect() as conn:
        # Take the write lock before reading, so the check, the window
        # rollover and the increment cannot interleave with another request's.
        conn.execute("BEGIN IMMEDIATE")
        try:
            row = conn.execute(
                "SELECT used, window_started FROM usage_quota WHERE bucket=? AND feature=?",
                (bucket, feature),
            ).fetchone()
            used, started = _window_state(row, now_dt)
            if used + cost > limit:
                conn.rollback()
                raise QuotaExceeded(
                    QuotaState(
                        feature=feature, used=used, limit=limit, window_started=started
                    )
                )
            # used is the windowed count, so an expired window is written back
            # as a fresh total rather than added to the stale one.
            conn.execute(
                """
                INSERT INTO usage_quota
                    (bucket, feature, used, first_seen, last_seen, window_started)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(bucket, feature) DO UPDATE SET
                  used = ?,
                  last_seen = excluded.last_seen,
                  window_started = excluded.window_started
                """,
                (bucket, feature, used + cost, now, now, started.isoformat(), used + cost),
            )
            conn.commit()
        except QuotaExceeded:
            raise
        except Exception:
            conn.rollback()
            raise
    return QuotaState(
        feature=feature, used=used + cost, limit=limit, window_started=started
    )


def refund(request: Request, feature: str, *, cost: int = 1) -> None:
    """Give a unit back when the work failed after the charge (never below zero)."""
    if not get_settings().quota_enabled:
        return
    bucket = bucket_for(request)
    if bucket is None:
        return
    with connect() as conn:
        conn.execute(
            "UPDATE usage_quota SET used = MAX(0, used - ?), last_seen = ? "
            "WHERE bucket=? AND feature=?",
            (cost, utc_now(), bucket, feature),
        )
        conn.commit()
