"""Usage reporting: one endpoint the browser writes to, one an owner reads.

The write side is deliberately cheap and unauthenticated - it is a beacon from
a page the visitor is already allowed to see, recording that they saw it. The
read side is not: it aggregates across every workspace on the install, so it is
the one place in the app where one person's request touches everybody's data.
That is gated on a token set in the environment, and when no token is set the
endpoint refuses rather than defaulting to open. An analytics dashboard that
ships publicly readable is a data leak with a chart on it.
"""

from __future__ import annotations

import hmac

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from ..config import get_settings
from ..services import analytics
from ..workspace import get_workspace

router = APIRouter(prefix="/analytics", tags=["analytics"])


class Beacon(BaseModel):
    path: str = Field(min_length=1, max_length=200)
    # "view" when the page opens, "dwell" when it is left with the time on it.
    kind: str = Field(default="view", max_length=16)
    seconds: float = Field(default=0.0, ge=0, le=7200)


@router.post("/track")
def track(body: Beacon, request: Request) -> dict[str, bool]:
    """Record a page view or the time spent on one. Never fails the caller."""
    try:
        analytics.record(get_workspace() or "anonymous", body.path, body.kind, body.seconds)
    except Exception:
        # Analytics must never be the reason a page errors. A dropped beacon is
        # a missing row; a raised exception is a broken visit.
        return {"ok": False}
    return {"ok": True}


def _authorised(token: str) -> bool:
    configured = (get_settings().admin_token or "").strip()
    if not configured:
        return False
    return hmac.compare_digest(token.strip(), configured)


@router.get("/overview")
def overview(days: int = 30, x_admin_token: str = Header(default="")) -> dict:
    """Everything on the dashboard. Requires ADMIN_TOKEN to be set and sent."""
    if not _authorised(x_admin_token):
        # The same answer whether the token is wrong or unset, so this cannot be
        # used to discover whether an install has analytics switched on.
        raise HTTPException(status_code=404, detail="Not Found")
    return analytics.overview(days)
