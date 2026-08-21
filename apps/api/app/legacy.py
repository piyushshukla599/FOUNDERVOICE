"""Carrying a pre-workspace install forward.

Before per-visitor workspaces existed, everything lived directly under the
data directory: one ``foundervoice.db``, one ``audio/``, one ``transcripts/``,
one ``reports/``. Afterwards every request resolves those paths under
``data/ws/<id>/`` instead, which means an install that upgrades in place opens
an empty database and the operator's recordings appear to have been deleted.
They have not - nothing reads them any more.

So on the first start after the upgrade, the old files are moved into a
workspace of their own and the id is written to a marker file. The first
visitor who arrives without a cookie *from a loopback or LAN address* is
handed that id instead of a fresh one, which on a personal install is the
person whose recordings these are. A stranger on a public deployment is not,
and once the workspace is claimed the marker stops handing it out at all.

The absolute paths stored in ``sessions.audio_path`` are rewritten as part of
the move. Playback would survive without it - the audio route resolves by
session id - but deletion and the "forget everything" purge both unlink the
stored path, and a stale one there silently fails to delete anything.
"""

from __future__ import annotations

import ipaddress
import shutil
import sqlite3
from pathlib import Path

from .config import get_settings
from . import workspace

MARKER = ".legacy-workspace"
_MOVED = ("foundervoice.db", "audio", "transcripts", "reports")


def _marker_path() -> Path:
    return get_settings().data_root / MARKER


def adopt_legacy_data() -> str | None:
    """Move pre-workspace data into a workspace of its own. Runs once.

    Returns the workspace id if a migration happened, None if there was
    nothing to migrate or it had already been done.
    """
    root = get_settings().data_root
    marker = _marker_path()
    if marker.exists():
        return None
    legacy_db = root / "foundervoice.db"
    if not legacy_db.exists():
        return None

    workspace_id = workspace.mint()
    dest = root / "ws" / workspace_id
    dest.mkdir(parents=True, exist_ok=True)
    for name in _MOVED:
        source = root / name
        if source.exists():
            shutil.move(str(source), str(dest / name))

    _rewrite_paths(dest / "foundervoice.db", dest / "audio")
    # Written last: a marker without the data behind it would strand the
    # recordings permanently, where a half-finished move is retried.
    marker.write_text(workspace_id, encoding="utf-8")
    return workspace_id


def _rewrite_paths(db_path: Path, audio_dir: Path) -> None:
    """Point every session at its file in the new directory, by name."""
    if not db_path.exists():
        return
    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT id, audio_path FROM sessions").fetchall()
        for row in rows:
            raw = (row["audio_path"] or "").strip()
            if not raw:
                continue
            moved = audio_dir / Path(raw).name
            if str(moved) != raw:
                conn.execute(
                    "UPDATE sessions SET audio_path=? WHERE id=?", (str(moved), row["id"])
                )
        conn.commit()
    except sqlite3.Error:
        # An old database without a sessions table is not worth failing a
        # boot over; the files are already where the new code looks.
        pass
    finally:
        conn.close()


def _is_local(host: str | None) -> bool:
    if not host:
        return False
    try:
        addr = ipaddress.ip_address(host.split("%")[0])
    except ValueError:
        return False
    return addr.is_loopback or addr.is_private or addr.is_link_local


def _unclaimed() -> str | None:
    marker = _marker_path()
    if not marker.exists():
        return None
    try:
        return marker.read_text(encoding="utf-8").strip() or None
    except OSError:
        return None


def offer(host: str | None) -> str | None:
    """The adopted workspace, if this caller should be given it.

    Called only when a request arrives with no usable cookie, so a visitor who
    already has a workspace is never redirected into this one.

    Deliberately not single-use. The first cookieless request to reach a fresh
    server is not reliably the browser - a health probe, a curl, a monitor or
    a second tab can get there first, and burning the offer on one of those
    would strand the recordings for good. Instead the offer stands until
    somebody comes back holding the cookie, which only a real client does.
    """
    workspace_id = _unclaimed()
    if not workspace_id or not _is_local(host):
        return None
    return workspace_id


def mark_claimed(workspace_id: str) -> None:
    """Someone returned holding this workspace's cookie; stop offering it.

    Emptying rather than deleting keeps adopt_legacy_data() from running a
    second time and minting a workspace nobody will ever be given.
    """
    if workspace_id and workspace_id == _unclaimed():
        try:
            _marker_path().write_text("", encoding="utf-8")
        except OSError:
            pass
