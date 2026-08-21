"""Per-visitor isolation.

The app has no accounts, and every query was written against one database. On
a personal install that is correct. On a public one it meant every visitor
shared a single workspace: your recordings, transcripts and Voice Memory were
listed to the next person who opened the site.

Adding ``WHERE workspace = ?`` to roughly a hundred queries would have worked
until somebody forgot one, and a forgotten filter is a silent data leak rather
than a broken page. So the separation is structural instead: each visitor gets
their own SQLite file and their own audio directory, chosen by
``Settings.data_path``. Every existing query is scoped without being touched,
and a query that forgets to filter cannot see another visitor because the rows
are not in the file it opened.

The identifier is a random token in a signed cookie. It proves nothing about
who you are, which is the point: it is a key to a drawer, not a login. Losing
the cookie loses access to that drawer, which is the honest bargain for
storage that never asked who you were.

Quota counters deliberately do NOT live in the per-visitor database. They are
keyed by network address in a shared one, so clearing the cookie gets you a
fresh workspace but not a fresh allowance.
"""

from __future__ import annotations

import functools
import hashlib
import hmac
import re
import secrets
from contextvars import ContextVar, Token
from typing import Any, Awaitable, Callable

COOKIE_NAME = "fv_ws"
# Long enough to be unguessable, short enough to keep directory names sane.
_ID_BYTES = 16
_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")

_current: ContextVar[str] = ContextVar("fv_workspace", default="")


def get_workspace() -> str:
    """The workspace for the request being handled, or "" outside a request."""
    return _current.get()


def set_workspace(value: str) -> Token[str]:
    return _current.set(value)


def reset_workspace(token: Token[str]) -> None:
    _current.reset(token)


def _secret() -> bytes:
    # Reuse the quota secret: both are server-held signing keys with the same
    # lifetime, and a second one is another thing to forget to set.
    from .config import get_settings

    return (get_settings().quota_secret or "fv-dev-secret").encode("utf-8")


def _sign(workspace_id: str) -> str:
    digest = hmac.new(_secret(), workspace_id.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()[:32]


def mint() -> str:
    return secrets.token_urlsafe(_ID_BYTES)


def to_cookie(workspace_id: str) -> str:
    return f"{workspace_id}.{_sign(workspace_id)}"


def from_cookie(raw: str | None) -> str | None:
    """The workspace id in a cookie, or None if absent, malformed or forged.

    The signature stops a visitor editing the cookie to name someone else's
    directory. The character check stops one containing "../" from naming a
    path outside the data directory at all, which matters more, because that
    string reaches the filesystem.
    """
    if not raw or "." not in raw:
        return None
    workspace_id, _, signature = raw.rpartition(".")
    if not _ID_RE.match(workspace_id):
        return None
    if not hmac.compare_digest(signature, _sign(workspace_id)):
        return None
    return workspace_id


def bind(fn: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
    """Carry the current workspace into work that runs after the response.

    Background tasks are executed once the response has been sent, by which
    point the request's context is gone. Without this the analysis would write
    its results into whichever workspace happened to be current, or none.
    """
    workspace_id = get_workspace()

    @functools.wraps(fn)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        token = set_workspace(workspace_id)
        try:
            return await fn(*args, **kwargs)
        finally:
            reset_workspace(token)

    return wrapper
