from __future__ import annotations

import re
from typing import Any

import librosa
import numpy as np

# Default builtins (also mirrored in filler_lexicon.BUILTIN_FILLERS).
# Note: bare "and" is intentionally NOT included — too many false positives.
FILLERS = [
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


def analyze_pace(words: list[dict[str, Any]], duration: float) -> dict[str, Any]:
    if not words or duration <= 0:
        return {
            "wpm": 0,
            "speaking_rate": 0,
            "articulation_rate": 0,
            "effective_speaking_rate": 0,
            "pace_variation": 0,
            "fastest_section": None,
            "slowest_section": None,
            "speed_events": [],
        }

    spoken = sum(max(0.0, w["end"] - w["start"]) for w in words)
    wpm = (len(words) / duration) * 60.0
    articulation = (len(words) / max(spoken, 0.01)) * 60.0
    # effective: exclude long silent gaps > 0.5s between words
    effective_time = spoken
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if 0 < gap < 0.5:
            effective_time += gap
    effective = (len(words) / max(effective_time, 0.01)) * 60.0

    window = 8.0
    rates = []
    for start in np.arange(0, max(duration - window, 0.1), 4.0):
        end = start + window
        count = sum(1 for w in words if start <= w["start"] < end)
        rates.append({"start": float(start), "end": float(end), "wpm": (count / window) * 60.0})

    fastest = max(rates, key=lambda r: r["wpm"]) if rates else None
    slowest = min(rates, key=lambda r: r["wpm"]) if rates else None
    variation = float(np.std([r["wpm"] for r in rates])) if rates else 0.0

    limit = 160.0
    speed_events = []
    for r in rates:
        if r["wpm"] > limit:
            speed_events.append(
                {
                    "kind": "too_fast",
                    "start": r["start"],
                    "end": r["end"],
                    "severity": min(1.0, (r["wpm"] - limit) / 60.0),
                    "label": f"Speaking too fast (~{r['wpm']:.0f} WPM)",
                    "cause": "Likely excitement or rushing through a dense section without a planned pause.",
                    "fix": "Rewrite this section shorter; mark a 0.6–0.8s pause before it; practice at 130–140 WPM.",
                    "exercise": "pause_drill_3",
                    "meta": {"wpm": r["wpm"]},
                }
            )

    return {
        "wpm": round(wpm, 1),
        "speaking_rate": round(wpm, 1),
        "articulation_rate": round(articulation, 1),
        "effective_speaking_rate": round(effective, 1),
        "pace_variation": round(variation, 1),
        "fastest_section": fastest,
        "slowest_section": slowest,
        "speed_events": speed_events,
        "pace_windows": rates,
    }


def detect_fillers(
    words: list[dict[str, Any]],
    duration: float,
    extra_phrases: list[str] | None = None,
) -> dict[str, Any]:
    """Detect filler phrases. Merges FILLERS with optional custom phrases from the UI."""
    lexicon = list(FILLERS)
    for p in extra_phrases or []:
        cleaned = re.sub(r"\s+", " ", (p or "").strip().lower())
        cleaned = re.sub(r"[^a-z0-9'\s]", "", cleaned).strip()
        if cleaned and cleaned not in lexicon:
            lexicon.append(cleaned)
    lexicon = sorted(set(lexicon), key=lambda s: (-len(s.split()), s))

    events = []
    i = 0
    lowered = [{"word": re.sub(r"[^a-zA-Z']", "", w["word"]).lower(), **w} for w in words]
    while i < len(lowered):
        matched = None
        for phrase in lexicon:
            parts = phrase.split()
            chunk = [lowered[j]["word"] for j in range(i, min(i + len(parts), len(lowered)))]
            if chunk == parts:
                matched = (phrase, lowered[i], lowered[i + len(parts) - 1])
                break
        if matched:
            phrase, start_w, end_w = matched
            custom = phrase not in FILLERS
            events.append(
                {
                    "kind": "filler",
                    "start": start_w["start"],
                    "end": end_w["end"],
                    "severity": 0.6 if custom else 0.55,
                    "label": f'Filler: "{phrase}"',
                    "cause": "Buying thinking time or soft-landing uncertainty.",
                    "fix": f'Replace "{phrase}" with a silent 0.4s pause or a planned bridge phrase.',
                    "exercise": "filler_fast",
                    "observation": f'Filler phrase "{phrase}" detected.',
                    "evidence": f'Heard at {start_w["start"]:.1f}s'
                    + (" (custom lexicon)" if custom else ""),
                    "impact": "Fillers dilute authority and make answers feel unrehearsed.",
                    "expected_improvement": "+8 Conversation Flow, +5 Authority (estimates)",
                    "meta": {"phrase": phrase, "custom": custom},
                }
            )
            i += len(phrase.split())
        else:
            i += 1

    rate = (len(events) / max(duration / 60.0, 0.01)) if duration else 0
    return {
        "filler_count": len(events),
        "filler_rate": round(rate, 2),
        "filler_pct": round(100.0 * len(events) / max(len(words), 1), 2),
        "lexicon_size": len(lexicon),
        "events": events,
        "timeline": [{"t": e["start"], "phrase": e["meta"]["phrase"]} for e in events],
    }


def analyze_pauses(y: np.ndarray, sr: int, words: list[dict[str, Any]]) -> dict[str, Any]:
    # Energy-based silence + gaps between words
    frame = int(0.03 * sr)
    hop = int(0.01 * sr)
    rms = librosa.feature.rms(y=y, frame_length=frame, hop_length=hop)[0]
    thr = float(np.median(rms) * 0.35 + 1e-8)
    silent = rms < thr
    pauses = []
    in_pause = False
    start_i = 0
    for i, s in enumerate(silent):
        if s and not in_pause:
            in_pause = True
            start_i = i
        elif not s and in_pause:
            in_pause = False
            start = start_i * hop / sr
            end = i * hop / sr
            dur = end - start
            if dur >= 0.25:
                pauses.append({"start": start, "end": end, "duration": dur, "type": "silent"})

    # word gaps as thinking pauses
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap >= 0.45:
            pauses.append(
                {
                    "start": words[i - 1]["end"],
                    "end": words[i]["start"],
                    "duration": gap,
                    "type": "thinking" if gap < 1.2 else "silent",
                }
            )

    # filled pauses already via fillers — mark breath-ish short silences mid-phrase
    for p in pauses:
        if 0.15 <= p["duration"] <= 0.35:
            p["type"] = "breath"

    # dedupe roughly
    pauses.sort(key=lambda p: p["start"])
    deduped = []
    for p in pauses:
        if deduped and abs(deduped[-1]["start"] - p["start"]) < 0.15:
            if p["duration"] > deduped[-1]["duration"]:
                deduped[-1] = p
            continue
        deduped.append(p)

    durations = [p["duration"] for p in deduped]
    avg = float(np.mean(durations)) if durations else 0.0
    longest = float(np.max(durations)) if durations else 0.0

    events = []
    for p in deduped:
        if p["duration"] >= 2.0:
            events.append(
                {
                    "kind": "long_pause",
                    "start": p["start"],
                    "end": p["end"],
                    "severity": min(1.0, p["duration"] / 4.0),
                    "label": f"Long pause ({p['duration']:.1f}s)",
                    "cause": "Lost place, searching for wording, or over-cautious delivery.",
                    "fix": "Script a bridge sentence for this beat; practice the transition twice.",
                    "exercise": "story_arc",
                    "meta": p,
                }
            )

    # missing pauses: long continuous speech > 12s without pause
    missing = []
    if words:
        last_break = words[0]["start"]
        for i in range(1, len(words)):
            gap = words[i]["start"] - words[i - 1]["end"]
            if gap >= 0.35:
                last_break = words[i]["start"]
            elif words[i]["end"] - last_break > 12:
                missing.append({"start": last_break, "end": words[i]["end"]})
                events.append(
                    {
                        "kind": "missing_pause",
                        "start": last_break,
                        "end": words[i]["end"],
                        "severity": 0.6,
                        "label": "Missing pause in long stretch",
                        "cause": "Dense delivery without breath or emphasis points.",
                        "fix": "Split into two claims; breathe between them.",
                        "exercise": "breath_box",
                        "meta": {},
                    }
                )
                last_break = words[i]["end"]

    pause_quality = max(0.0, min(100.0, 70 + (8 - abs(avg - 0.6) * 20) - len([e for e in events if e["kind"] == "long_pause"]) * 5))

    return {
        "pauses": deduped,
        "avg_pause_duration": round(avg, 3),
        "longest_pause": round(longest, 3),
        "missing_pauses": missing,
        "pause_heatmap": [{"t": p["start"], "duration": p["duration"], "type": p["type"]} for p in deduped],
        "pause_quality": round(pause_quality, 1),
        "recommended_pause_locations": [{"t": m["start"] + 6, "reason": "Break long stretch"} for m in missing[:5]],
        "events": events,
    }


def analyze_acoustics(y: np.ndarray, sr: int) -> dict[str, Any]:
    # Pitch via piptrack
    pitches, mags = librosa.piptrack(y=y, sr=sr, fmin=60, fmax=400)
    pitch_vals = []
    for t in range(pitches.shape[1]):
        idx = mags[:, t].argmax()
        p = pitches[idx, t]
        if p > 0:
            pitch_vals.append(float(p))
    pitch_vals = np.array(pitch_vals) if pitch_vals else np.array([0.0])
    pitch_mean = float(np.mean(pitch_vals))
    pitch_std = float(np.std(pitch_vals))
    pitch_stability = max(0.0, 100.0 - pitch_std)
    pitch_variation = min(100.0, pitch_std * 2)

    rms = librosa.feature.rms(y=y)[0]
    loudness = float(np.mean(librosa.amplitude_to_db(rms + 1e-8)))
    vol_consistency = max(0.0, 100.0 - float(np.std(rms)) * 400)
    energy = float(np.mean(rms) * 1000)
    dynamic_range = float(np.percentile(rms, 95) - np.percentile(rms, 10))

    # crude tremor / breathiness / fatigue estimates
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))
    breathiness = min(100.0, zcr * 800)
    tremor = min(100.0, pitch_std * 1.5)
    fatigue = min(100.0, max(0.0, (len(y) / sr / 60.0) * 15 + (100 - vol_consistency) * 0.3))

    # emotion-ish estimates from energy/pitch
    confidence = max(0.0, min(100.0, 50 + (energy - 5) * 3 + (pitch_variation - 20) * 0.4 - tremor * 0.2))
    stress = max(0.0, min(100.0, pitch_std * 1.2 + (100 - vol_consistency) * 0.3))
    excitement = max(0.0, min(100.0, energy * 4 + pitch_variation * 0.5))
    nervousness = max(0.0, min(100.0, tremor * 0.7 + stress * 0.4))
    enthusiasm = max(0.0, min(100.0, excitement * 0.7 + pitch_variation * 0.3))
    calmness = max(0.0, min(100.0, 100 - stress * 0.6 - excitement * 0.2))
    conviction = max(0.0, min(100.0, confidence * 0.6 + (100 - breathiness) * 0.2 + vol_consistency * 0.2))
    monotone = max(0.0, min(100.0, 100 - pitch_variation))

    events = []
    if vol_consistency < 55:
        events.append(
            {
                "kind": "too_quiet_variable",
                "start": 0.0,
                "end": float(len(y) / sr),
                "severity": 0.5,
                "label": "Uneven volume",
                "cause": "Inconsistent mic distance or confidence dips.",
                "fix": "Fix mic distance; mark loudness targets on key claims.",
                "exercise": "confidence_stance",
                "meta": {"volume_consistency": vol_consistency},
            }
        )
    if monotone > 70:
        events.append(
            {
                "kind": "monotone",
                "start": 0.0,
                "end": min(20.0, float(len(y) / sr)),
                "severity": 0.55,
                "label": "Monotone delivery (estimate)",
                "cause": "Limited pitch variation reduces emphasis and engagement.",
                "fix": "Emphasize one keyword per sentence with a slight pitch rise.",
                "exercise": "pitch_variation",
                "meta": {"monotone_score": monotone},
            }
        )

    # breathing estimate from low-energy valleys
    valleys = np.where(rms < np.median(rms) * 0.4)[0]
    breath_events = 0
    if len(valleys):
        gaps = np.diff(valleys)
        breath_events = int(np.sum(gaps > 20))
    duration_min = max((len(y) / sr) / 60.0, 0.01)
    breath_freq = breath_events / duration_min

    return {
        "pitch_mean": round(pitch_mean, 1),
        "pitch_stability": round(pitch_stability, 1),
        "pitch_variation": round(pitch_variation, 1),
        "loudness_mean": round(loudness, 1),
        "volume_consistency": round(vol_consistency, 1),
        "energy": round(energy, 2),
        "dynamic_range": round(dynamic_range, 4),
        "voice_tremor": round(tremor, 1),
        "breathiness": round(breathiness, 1),
        "voice_fatigue": round(fatigue, 1),
        "resonance_est": round(max(0, 100 - breathiness * 0.5), 1),
        "voice_steadiness": round(max(0, 100 - tremor * 0.6), 1),
        "confidence_est": round(confidence, 1),
        "stress_est": round(stress, 1),
        "excitement_est": round(excitement, 1),
        "nervousness_est": round(nervousness, 1),
        "enthusiasm_est": round(enthusiasm, 1),
        "calmness_est": round(calmness, 1),
        "conviction_est": round(conviction, 1),
        "monotone_score": round(monotone, 1),
        "breath_frequency": round(breath_freq, 2),
        "breath_duration_est": 0.3,
        "events": events,
        "note": "Emotional and breath metrics are estimates from acoustics, not clinical measures.",
    }


def pronunciation_and_clarity(words: list[dict[str, Any]]) -> dict[str, Any]:
    events = []
    low = []
    for w in words:
        prob = float(w.get("probability") or 0)
        token = re.sub(r"[^a-zA-Z']", "", w.get("word", ""))
        if not token:
            continue
        if prob and prob < 0.55:
            low.append(w)
            events.append(
                {
                    "kind": "pronunciation_issue",
                    "start": w["start"],
                    "end": w["end"],
                    "severity": 1.0 - prob,
                    "label": f'Unclear pronunciation: "{token}"',
                    "cause": "Low ASR confidence often tracks mumbling, dropped endings, or weak consonants.",
                    "fix": f'Over-articulate "{token}" — especially the final syllable — then re-record that sentence.',
                    "exercise": "pronunciation_tech",
                    "meta": {"word": token, "probability": prob},
                }
            )

    # repeated words
    for i in range(1, len(words)):
        a = re.sub(r"[^a-zA-Z']", "", words[i - 1]["word"]).lower()
        b = re.sub(r"[^a-zA-Z']", "", words[i]["word"]).lower()
        if a and a == b and len(a) > 2:
            events.append(
                {
                    "kind": "repeated_word",
                    "start": words[i - 1]["start"],
                    "end": words[i]["end"],
                    "severity": 0.4,
                    "label": f'Repeated word: "{a}"',
                    "cause": "Self-correction or stalling while retrieving the next idea.",
                    "fix": "Pause silently instead of repeating; advance to the next claim.",
                    "exercise": "executive_open",
                    "meta": {"word": a},
                }
            )

    probs = [float(w.get("probability") or 0.75) for w in words] or [0.75]
    clarity = float(np.mean(probs) * 100)
    return {
        "clarity": round(clarity, 1),
        "avg_word_clarity": round(clarity, 1),
        "low_confidence_words": low[:50],
        "events": events,
        "intelligibility": round(clarity, 1),
    }
