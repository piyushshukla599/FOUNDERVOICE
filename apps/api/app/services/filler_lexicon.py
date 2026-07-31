"""Filler word lexicon: built-in defaults + user custom phrases."""

from __future__ import annotations

import re
from typing import Any

from ..db import connect, utc_now

# Built-in list used when no custom DB rows exist (also always included).
BUILTIN_FILLERS = [
    "um",
    "uh",
    "uhm",
    "like",
    "basically",
    "actually",
    "literally",
    "you know",
    "kind of",
    "sort of",
    "right",
]


def _norm(phrase: str) -> str:
    p = re.sub(r"\s+", " ", (phrase or "").strip().lower())
    p = re.sub(r"[^a-z0-9'\s]", "", p)
    return p.strip()


def list_custom() -> list[str]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT phrase FROM custom_fillers ORDER BY phrase COLLATE NOCASE"
        ).fetchall()
    return [r["phrase"] for r in rows]


def get_lexicon() -> dict[str, Any]:
    custom = list_custom()
    active = sorted(set(BUILTIN_FILLERS) | set(custom), key=lambda s: (-len(s.split()), s))
    return {
        "builtin": list(BUILTIN_FILLERS),
        "custom": custom,
        "active": active,
        "note": "Custom fillers are merged with built-ins for every session analysis.",
    }


def add_filler(phrase: str) -> dict[str, Any]:
    p = _norm(phrase)
    if not p or len(p) > 40:
        raise ValueError("Filler must be 1–40 characters after normalization.")
    if p in BUILTIN_FILLERS:
        return get_lexicon()  # already covered
    with connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO custom_fillers (phrase, created_at) VALUES (?, ?)",
            (p, utc_now()),
        )
        conn.commit()
    return get_lexicon()


def remove_filler(phrase: str) -> dict[str, Any]:
    p = _norm(phrase)
    with connect() as conn:
        conn.execute("DELETE FROM custom_fillers WHERE phrase = ?", (p,))
        conn.commit()
    return get_lexicon()


def set_custom(phrases: list[str]) -> dict[str, Any]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in phrases:
        p = _norm(raw)
        if not p or p in BUILTIN_FILLERS or p in seen or len(p) > 40:
            continue
        seen.add(p)
        cleaned.append(p)
    with connect() as conn:
        conn.execute("DELETE FROM custom_fillers")
        for p in cleaned:
            conn.execute(
                "INSERT INTO custom_fillers (phrase, created_at) VALUES (?, ?)",
                (p, utc_now()),
            )
        conn.commit()
    return get_lexicon()
