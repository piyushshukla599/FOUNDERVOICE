"""Personal Voice Profile — longitudinal estimates updated after every session.

Honest framing: these are acoustic/ASR-derived estimates, not medical measures.
Goal: strengthen the user's own voice — never change accent or natural timbre.
"""

from __future__ import annotations

from typing import Any

from ..db import connect, dumps, loads, utc_now

PROFILE_KEYS = [
    "voice_warmth",
    "voice_resonance",
    "projection",
    "pitch_stability",
    "pitch_range",
    "speaking_energy",
    "articulation",
    "clarity",
    "authority",
    "executive_presence",
    "trustworthiness",
    "persuasiveness",
    "pronunciation",
    "technical_communication",
    "pause_control",
    "breathing_quality",
    "storytelling",
    "conversation_flow",
    "monotone_level",  # higher = more monotone (worse)
    "voice_fatigue",  # higher = more fatigue (worse)
]

# Keys where lower is better when showing "improvement"
INVERSE_KEYS = {"monotone_level", "voice_fatigue"}


def _clamp(v: float) -> float:
    return round(max(0.0, min(100.0, float(v))), 1)


def scores_from_session(metrics: dict[str, Any], acoustics: dict[str, Any] | None = None) -> dict[str, float]:
    ac = acoustics or {}
    clarity = float(metrics.get("clarity") or 60)
    conf = float(metrics.get("confidence_est") or ac.get("confidence_est") or 55)
    pause_q = float(metrics.get("pause_quality") or 50)
    pitch_stab = float(metrics.get("pitch_stability") or ac.get("pitch_stability") or 55)
    pitch_var = float(metrics.get("pitch_variation") or ac.get("pitch_variation") or 30)
    energy = float(metrics.get("energy") or ac.get("energy") or 5)
    vol_cons = float(metrics.get("volume_consistency") or ac.get("volume_consistency") or 60)
    monotone = float(metrics.get("monotone_score") or ac.get("monotone_score") or 40)
    breath_f = float(metrics.get("breath_frequency") or ac.get("breath_frequency") or 8)
    resonance = float(ac.get("resonance_est") or max(0, 100 - float(ac.get("breathiness") or 30) * 0.5))
    fatigue = float(ac.get("voice_fatigue") or 30)
    ceo = float(metrics.get("executive_presence") or metrics.get("ceo_presence") or conf)
    trust = float(metrics.get("founder_trust") or conf)
    grammar = float(metrics.get("grammar_score") or 65)
    filler_rate = float(metrics.get("filler_rate") or 0)
    wpm = float(metrics.get("wpm") or 140)

    # Projection estimate: loudness consistency + energy without shouting heuristic
    projection = _clamp(vol_cons * 0.45 + min(100, energy * 8) * 0.35 + conf * 0.2)
    articulation = _clamp(clarity * 0.7 + max(0, 100 - filler_rate * 800) * 0.3)
    pronunciation = _clamp(clarity)
    tech = _clamp(clarity * 0.55 + grammar * 0.25 + max(0, 100 - abs(wpm - 135) * 1.2) * 0.2)
    breathing = _clamp(max(0, 100 - abs(breath_f - 10) * 4) * 0.5 + pause_q * 0.5)
    warmth = _clamp(resonance * 0.5 + (100 - monotone) * 0.25 + conf * 0.25)
    authority = _clamp(ceo * 0.45 + pitch_stab * 0.25 + projection * 0.3)
    persuasiveness = _clamp(conf * 0.35 + clarity * 0.35 + pause_q * 0.3)
    storytelling = _clamp(pause_q * 0.4 + pitch_var * 0.3 + (100 - monotone) * 0.3)
    conversation = _clamp(max(0, 100 - filler_rate * 900) * 0.4 + pause_q * 0.3 + clarity * 0.3)
    speaking_energy = _clamp(min(100, energy * 10) * 0.5 + pitch_var * 0.3 + projection * 0.2)

    return {
        "voice_warmth": warmth,
        "voice_resonance": _clamp(resonance),
        "projection": projection,
        "pitch_stability": _clamp(pitch_stab),
        "pitch_range": _clamp(pitch_var),
        "speaking_energy": speaking_energy,
        "articulation": articulation,
        "clarity": _clamp(clarity),
        "authority": authority,
        "executive_presence": _clamp(ceo),
        "trustworthiness": _clamp(trust),
        "persuasiveness": persuasiveness,
        "pronunciation": pronunciation,
        "technical_communication": tech,
        "pause_control": _clamp(pause_q),
        "breathing_quality": breathing,
        "storytelling": storytelling,
        "conversation_flow": conversation,
        "monotone_level": _clamp(monotone),
        "voice_fatigue": _clamp(fatigue),
    }


def _ema(old: float | None, new: float, alpha: float = 0.35) -> float:
    if old is None:
        return new
    return _clamp(old * (1 - alpha) + new * alpha)


def extract_hard_words(events: list[dict[str, Any]], existing: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    by_word: dict[str, dict[str, Any]] = {}
    for item in existing or []:
        w = (item.get("word") or "").lower()
        if w:
            by_word[w] = dict(item)
    for e in events:
        if e.get("kind") != "pronunciation_issue":
            continue
        meta = e.get("meta") or {}
        word = (meta.get("word") or "").strip()
        if not word or len(word) < 4:
            continue
        key = word.lower()
        prev = by_word.get(key) or {"word": word, "count": 0, "avg_confidence": 1.0}
        n = int(prev["count"]) + 1
        conf = float(meta.get("probability") or 0.4)
        prev_avg = float(prev.get("avg_confidence") or conf)
        prev["count"] = n
        prev["avg_confidence"] = round((prev_avg * (n - 1) + conf) / n, 3)
        prev["last_seen"] = utc_now()
        prev["word"] = word
        by_word[key] = prev
    ranked = sorted(by_word.values(), key=lambda x: (-int(x.get("count") or 0), float(x.get("avg_confidence") or 1)))
    return ranked[:40]


def update_voice_profile(
    session_id: str,
    metrics: dict[str, Any],
    events: list[dict[str, Any]],
    acoustics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    session_scores = scores_from_session(metrics, acoustics)
    with connect() as conn:
        row = conn.execute("SELECT * FROM voice_profile WHERE id=1").fetchone()
        if row:
            scores = loads(row["scores_json"], {}) or {}
            history = loads(row["history_json"], []) or []
            baseline = loads(row["baseline_json"], None)
            hard = loads(row["hard_words_json"], []) or []
            counted = int(row["sessions_counted"] or 0)
        else:
            scores, history, baseline, hard, counted = {}, [], None, [], 0

        merged = {}
        for k in PROFILE_KEYS:
            merged[k] = _ema(scores.get(k), session_scores[k])

        if baseline is None and counted == 0:
            baseline = dict(session_scores)

        hard = extract_hard_words(events, hard)
        history.append(
            {
                "session_id": session_id,
                "at": utc_now(),
                "scores": session_scores,
            }
        )
        history = history[-90:]
        counted += 1

        payload = (
            1,
            dumps(merged),
            dumps(baseline),
            dumps(history),
            dumps(hard),
            utc_now(),
            counted,
        )
        conn.execute(
            """
            INSERT INTO voice_profile (id, scores_json, baseline_json, history_json, hard_words_json, updated_at, sessions_counted)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              scores_json=excluded.scores_json,
              baseline_json=excluded.baseline_json,
              history_json=excluded.history_json,
              hard_words_json=excluded.hard_words_json,
              updated_at=excluded.updated_at,
              sessions_counted=excluded.sessions_counted
            """,
            payload,
        )
        conn.commit()

    return get_voice_profile()


def get_voice_profile() -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM voice_profile WHERE id=1").fetchone()
    if not row:
        return {
            "scores": {k: None for k in PROFILE_KEYS},
            "baseline": None,
            "deltas": {},
            "hard_words": [],
            "history": [],
            "sessions_counted": 0,
            "updated_at": None,
            "note": "Estimates only. Improvements come from habits — not changing your natural voice or accent.",
        }

    scores = loads(row["scores_json"], {}) or {}
    baseline = loads(row["baseline_json"], {}) or {}
    history = loads(row["history_json"], []) or []
    hard = loads(row["hard_words_json"], []) or []
    deltas = {}
    for k in PROFILE_KEYS:
        if scores.get(k) is None or baseline.get(k) is None:
            continue
        raw = float(scores[k]) - float(baseline[k])
        # For inverse keys, improvement is negative delta in the stored score
        deltas[k] = round(-raw if k in INVERSE_KEYS else raw, 1)

    # Weekly / monthly rollups from history
    def window_avg(n: int) -> dict[str, float | None]:
        chunk = history[-n:] if history else []
        if not chunk:
            return {k: None for k in PROFILE_KEYS}
        out = {}
        for k in PROFILE_KEYS:
            vals = [float(h["scores"][k]) for h in chunk if h.get("scores", {}).get(k) is not None]
            out[k] = round(sum(vals) / len(vals), 1) if vals else None
        return out

    return {
        "scores": scores,
        "baseline": baseline,
        "deltas": deltas,
        "hard_words": hard[:20],
        "history": history[-30:],
        "weekly": window_avg(min(7, len(history))),
        "monthly": window_avg(min(30, len(history))),
        "sessions_counted": row["sessions_counted"],
        "updated_at": row["updated_at"],
        "note": "Estimates only. We train breathing, resonance, articulation, pacing, projection, and habits — not your accent or biology.",
        "inverse_keys": sorted(INVERSE_KEYS),
    }


def reset_voice_profile() -> None:
    with connect() as conn:
        conn.execute("DELETE FROM voice_profile")
        conn.execute("DELETE FROM training_plan")
        conn.execute("DELETE FROM daily_missions")
        conn.execute("DELETE FROM voice_settings")
        conn.commit()
