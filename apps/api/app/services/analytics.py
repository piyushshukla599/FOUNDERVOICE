"""What is actually happening on the site, counted honestly.

Two things make this harder than a usual analytics table, and both are worth
stating rather than papering over:

**There are no accounts.** Nobody signs up, so there is no registration to
count and no user to be active. What exists is a workspace: a random token in
a cookie that owns one SQLite file. It is the closest thing to a person the
app has, and it is a good deal weaker than one - clearing cookies makes a new
"visitor", two browsers on one desk are two, and a shared laptop is one.
Everything below says "visitor" and means workspace, because calling it a user
would be a claim the data does not support.

**The recordings are not in one database.** Each workspace has its own file,
which is what keeps one visitor's transcripts away from the next. Aggregating
therefore means walking the workspace directory and opening each file rather
than writing a GROUP BY. That is fine at this size and would not be at a
hundred thousand; the cost is one small read per visitor.

Page views and time-on-page are the one thing nothing recorded before, so they
are collected into the shared database by a beacon from the browser.
"""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ..config import get_settings
from ..db import connect_shared


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse(stamp: Any) -> datetime | None:
    text = str(stamp or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def record(workspace: str, path: str, kind: str, seconds: float) -> None:
    """One page view, or the time spent on a page once it is left."""
    with connect_shared() as conn:
        conn.execute(
            "INSERT INTO analytics_events (workspace, path, kind, seconds, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                workspace[:64],
                path[:200],
                kind[:16],
                max(0.0, min(7200.0, float(seconds or 0))),
                _now().isoformat(),
            ),
        )
        conn.commit()


def _workspace_dbs() -> list[tuple[str, Path]]:
    """Every visitor's database file."""
    settings = get_settings()
    root = settings.data_root / "ws"
    if not root.exists():
        # Single-workspace install: the one database is the whole picture.
        single = settings.data_root / "foundervoice.db"
        return [("default", single)] if single.exists() else []
    found: list[tuple[str, Path]] = []
    for child in sorted(root.iterdir()):
        db = child / "foundervoice.db"
        if child.is_dir() and db.exists():
            found.append((child.name, db))
    return found


def _takes() -> list[dict[str, Any]]:
    """Every recording on the install, tagged with the visitor it belongs to."""
    rows: list[dict[str, Any]] = []
    for workspace, path in _workspace_dbs():
        try:
            conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
        except sqlite3.Error:
            continue
        try:
            found = conn.execute(
                "SELECT id, created_at, title, mode, duration, status, exercise_key FROM sessions"
            ).fetchall()
        except sqlite3.Error:
            # A workspace from an older build, or one mid-migration. Skipping it
            # under-counts by one visitor, which beats failing the whole report.
            continue
        finally:
            conn.close()
        rows.extend({**dict(row), "workspace": workspace} for row in found)
    return rows


def _category(row: dict[str, Any]) -> str:
    """What the take was for, using the label the app itself put on it."""
    for field in ("title", "exercise_key", "mode"):
        value = str(row.get(field) or "").strip()
        if value:
            return value[:60]
    return "Unlabelled"


def overview(days: int = 30) -> dict[str, Any]:
    """Everything the dashboard shows, in one pass."""
    now = _now()
    days = max(1, min(365, days))
    since = now - timedelta(days=days)

    takes = _takes()
    first_seen: dict[str, datetime] = {}
    per_day: dict[str, int] = defaultdict(int)
    per_day_visitors: dict[str, set[str]] = defaultdict(set)
    categories: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0.0, "seconds": 0.0})
    durations: list[float] = []
    longest: dict[str, Any] | None = None
    failed = 0

    for row in takes:
        workspace = str(row.get("workspace") or "")
        made = _parse(row.get("created_at"))
        if made and (workspace not in first_seen or made < first_seen[workspace]):
            first_seen[workspace] = made
        if str(row.get("status") or "") == "error":
            failed += 1

        duration = float(row.get("duration") or 0.0)
        durations.append(duration)
        if made and made >= since:
            day = made.date().isoformat()
            per_day[day] += 1
            per_day_visitors[day].add(workspace)

        name = _category(row)
        categories[name]["count"] += 1
        categories[name]["seconds"] += duration
        if duration and (longest is None or duration > float(longest["duration"])):
            longest = {
                "category": name,
                "duration": round(duration, 1),
                "created_at": row.get("created_at"),
            }

    with connect_shared() as conn:
        pages = conn.execute(
            "SELECT path,"
            " SUM(CASE WHEN kind = 'view' THEN 1 ELSE 0 END) AS views,"
            " SUM(seconds) AS seconds,"
            " COUNT(DISTINCT workspace) AS visitors"
            " FROM analytics_events WHERE created_at >= ?"
            " GROUP BY path ORDER BY views DESC LIMIT 40",
            (since.isoformat(),),
        ).fetchall()
        seen_rows = conn.execute(
            "SELECT workspace, MAX(created_at) AS last_seen, MIN(created_at) AS first_seen"
            " FROM analytics_events GROUP BY workspace"
        ).fetchall()
        quota_rows = conn.execute(
            "SELECT feature, SUM(used) AS used, COUNT(*) AS buckets"
            " FROM usage_quota GROUP BY feature ORDER BY used DESC"
        ).fetchall()

    # A visitor counts as first seen at whichever came first: a page view or a
    # recording. Page views only exist from the day the beacon shipped, so the
    # recordings are what make the earlier history visible at all.
    for row in seen_rows:
        workspace = str(row["workspace"] or "")
        stamp = _parse(row["first_seen"])
        if stamp and (workspace not in first_seen or stamp < first_seen[workspace]):
            first_seen[workspace] = stamp

    last_seen: dict[str, datetime] = {}
    for row in seen_rows:
        stamp = _parse(row["last_seen"])
        if stamp:
            last_seen[str(row["workspace"] or "")] = stamp

    def new_within(hours: int) -> int:
        edge = now - timedelta(hours=hours)
        return sum(1 for stamp in first_seen.values() if stamp >= edge)

    def active_within(hours: int) -> int:
        edge = now - timedelta(hours=hours)
        return sum(1 for stamp in last_seen.values() if stamp >= edge)

    new_per_day: dict[str, int] = defaultdict(int)
    for stamp in first_seen.values():
        if stamp >= since:
            new_per_day[stamp.date().isoformat()] += 1

    total_seconds = sum(durations)
    ordered = sorted(
        (
            {
                "category": name,
                "count": int(stat["count"]),
                "minutes": round(stat["seconds"] / 60.0, 1),
                "avg_seconds": round(stat["seconds"] / stat["count"], 1) if stat["count"] else 0.0,
            }
            for name, stat in categories.items()
        ),
        key=lambda c: (c["count"], c["minutes"]),
        reverse=True,
    )

    return {
        "generated_at": now.isoformat(),
        "window_days": days,
        "has_accounts": False,
        "visitors": {
            "total": len(first_seen),
            "new_today": new_within(24),
            "new_this_week": new_within(24 * 7),
            "new_this_month": new_within(24 * 30),
            "active_today": active_within(24),
            "active_this_week": active_within(24 * 7),
            "active_this_month": active_within(24 * 30),
            "per_day": [{"day": d, "count": n} for d, n in sorted(new_per_day.items())],
        },
        "recordings": {
            "total": len(takes),
            "failed": failed,
            "total_minutes": round(total_seconds / 60.0, 1),
            "avg_seconds": round(total_seconds / len(durations), 1) if durations else 0.0,
            "longest": longest,
            "per_day": [
                {"day": d, "count": n, "visitors": len(per_day_visitors[d])}
                for d, n in sorted(per_day.items())
            ],
        },
        "categories": ordered,
        "pages": [
            {
                "path": r["path"],
                "views": int(r["views"] or 0),
                "minutes": round(float(r["seconds"] or 0) / 60.0, 1),
                "visitors": int(r["visitors"] or 0),
                "avg_seconds": round(float(r["seconds"] or 0) / int(r["views"] or 1), 1),
            }
            for r in pages
        ],
        "features": [
            {"feature": r["feature"], "used": int(r["used"] or 0), "buckets": int(r["buckets"] or 0)}
            for r in quota_rows
        ],
    }
