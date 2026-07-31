"""Professional voice & executive presence analysis.

Builds evidence-linked coaching reports from acoustic + ASR features.
All scores are estimates — never claim clinical precision or accent change.
"""

from __future__ import annotations

from typing import Any

import librosa
import numpy as np


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return round(max(lo, min(hi, float(v))), 1)


def _finding(
    *,
    observation: str,
    cause: str,
    evidence: str,
    impact: str,
    fix: str,
    exercise: str,
    expected: str,
    kind: str,
    start: float = 0.0,
    end: float = 0.0,
    severity: float = 0.5,
) -> dict[str, Any]:
    return {
        "kind": kind,
        "start": start,
        "end": end,
        "severity": severity,
        "label": observation,
        "cause": cause,
        "fix": fix,
        "exercise": exercise,
        "observation": observation,
        "evidence": evidence,
        "impact": impact,
        "expected_improvement": expected,
        "meta": {},
    }


def enhance_acoustics(y: np.ndarray, sr: int, base: dict[str, Any]) -> dict[str, Any]:
    """Add pitch timeline + spectral resonance estimates on top of analyze_acoustics."""
    duration = float(len(y) / max(sr, 1))
    hop = 512
    pitches, mags = librosa.piptrack(y=y, sr=sr, fmin=60, fmax=400, hop_length=hop)
    timeline: list[dict[str, float]] = []
    for t in range(0, pitches.shape[1], max(1, int(0.25 * sr / hop))):
        idx = int(mags[:, t].argmax())
        p = float(pitches[idx, t])
        if p > 0:
            timeline.append({"t": round(t * hop / sr, 2), "hz": round(p, 1)})

    # Spectral features for brightness / nasal / chest proxies
    cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)[0]
    bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    cent_mean = float(np.mean(cent)) if len(cent) else 1500.0
    roll_mean = float(np.mean(rolloff)) if len(rolloff) else 3000.0
    bw_mean = float(np.mean(bandwidth)) if len(bandwidth) else 1500.0

    # Heuristic resonance placement (estimate)
    # Lower centroid → more chest/warm; high + narrow → nasal/bright
    chest = _clamp(100 - (cent_mean - 800) / 25)
    nasal = _clamp((cent_mean - 1800) / 20 + (bw_mean < 1200) * 20)
    throat = _clamp(55 + (base.get("vocal_tension_est") or base.get("voice_tremor") or 20) * 0.3 - chest * 0.2)
    brightness = _clamp((cent_mean - 1000) / 30)
    depth = _clamp(100 - brightness * 0.6 + (base.get("resonance_est") or 50) * 0.2)

    pitch_vals = [p["hz"] for p in timeline] or [float(base.get("pitch_mean") or 0)]
    pitch_range_hz = float(max(pitch_vals) - min(pitch_vals)) if pitch_vals else 0.0

    # Vocal fry estimate: low pitch + low energy frames
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    fry_frames = 0
    total_voiced = max(1, len(timeline))
    for pt in timeline:
        # rough: very low hz relative to mean
        if pt["hz"] < max(70, float(base.get("pitch_mean") or 120) * 0.55):
            fry_frames += 1
    vocal_fry = _clamp(100 * fry_frames / total_voiced)

    # Tension proxy from high ZCR + tremor already in base
    tension = _clamp(float(base.get("voice_tremor") or 0) * 0.5 + float(base.get("breathiness") or 0) * 0.3)

    # Emotion windows (~8s)
    emotion_timeline: list[dict[str, Any]] = []
    win = int(8.0 * sr)
    step = int(4.0 * sr)
    for start in range(0, max(1, len(y) - win // 2), step):
        chunk = y[start : start + win]
        if len(chunk) < sr:
            break
        e_rms = float(np.mean(librosa.feature.rms(y=chunk)[0]) * 1000)
        e_zcr = float(np.mean(librosa.feature.zero_crossing_rate(chunk)))
        conf = _clamp(50 + (e_rms - 5) * 3)
        stress = _clamp(e_zcr * 600 + max(0, 8 - e_rms) * 4)
        if stress > 65:
            label = "Stress increased"
        elif conf > 70 and stress < 40:
            label = "Confident"
        elif e_rms < 3:
            label = "Soft / low energy"
        else:
            label = "Steady"
        emotion_timeline.append(
            {
                "t": round(start / sr, 1),
                "label": label,
                "confidence_est": conf,
                "stress_est": stress,
            }
        )

    out = dict(base)
    out.update(
        {
            "pitch_timeline": timeline[:240],
            "pitch_range_hz": round(pitch_range_hz, 1),
            "vocal_fry_est": vocal_fry,
            "brightness_est": brightness,
            "depth_est": depth,
            "chest_resonance_est": chest,
            "nasal_resonance_est": nasal,
            "throat_dominance_est": throat,
            "vocal_tension_est": tension,
            "spectral_centroid_hz": round(cent_mean, 1),
            "spectral_rolloff_hz": round(roll_mean, 1),
            "emotion_timeline": emotion_timeline[:40],
            "duration_sec": round(duration, 1),
            "note": (
                "Voice quality, resonance, emotion, and breath metrics are acoustic estimates — "
                "not medical diagnoses. We improve clarity and habits, never accent identity."
            ),
        }
    )
    return out


def build_professional_report(
    *,
    acoustics: dict[str, Any],
    pace: dict[str, Any],
    pauses: dict[str, Any],
    clarity: dict[str, Any],
    words: list[dict[str, Any]],
    duration: float,
) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []

    warmth = _clamp(
        float(acoustics.get("resonance_est") or 50) * 0.45
        + float(acoustics.get("depth_est") or 50) * 0.25
        + (100 - float(acoustics.get("monotone_score") or 40)) * 0.15
        + float(acoustics.get("confidence_est") or 55) * 0.15
    )
    depth = float(acoustics.get("depth_est") or 55)
    resonance = float(acoustics.get("resonance_est") or 55)
    chest = float(acoustics.get("chest_resonance_est") or 55)
    nasal = float(acoustics.get("nasal_resonance_est") or 30)
    throat = float(acoustics.get("throat_dominance_est") or 45)
    brightness = float(acoustics.get("brightness_est") or 40)
    breathiness = float(acoustics.get("breathiness") or 30)
    tension = float(acoustics.get("vocal_tension_est") or 30)
    fatigue = float(acoustics.get("voice_fatigue") or 25)
    stability = float(acoustics.get("voice_steadiness") or acoustics.get("pitch_stability") or 55)
    richness = _clamp(warmth * 0.4 + resonance * 0.4 + (100 - breathiness) * 0.2)
    texture = _clamp(100 - abs(brightness - 45) * 0.8 - breathiness * 0.2)
    balance = _clamp(100 - abs(chest - nasal) * 0.4 - abs(brightness - 40) * 0.3)
    projection = _clamp(
        float(acoustics.get("volume_consistency") or 60) * 0.45
        + min(100, float(acoustics.get("energy") or 5) * 8) * 0.35
        + float(acoustics.get("confidence_est") or 55) * 0.2
    )
    control = _clamp(stability * 0.5 + float(acoustics.get("pitch_stability") or 55) * 0.3 + float(pauses.get("pause_quality") or 50) * 0.2)

    voice_quality_dims = {
        "voice_warmth": warmth,
        "voice_depth": depth,
        "vocal_resonance": resonance,
        "chest_resonance": chest,
        "nasal_resonance": nasal,
        "brightness": brightness,
        "breathiness": breathiness,
        "vocal_tension": tension,
        "vocal_fatigue": fatigue,
        "vocal_stability": stability,
        "voice_richness": richness,
        "voice_texture": texture,
        "vocal_balance": balance,
        "projection": projection,
        "vocal_control": control,
    }
    # Overall: reward desirable traits; penalize breathiness/tension/fatigue/nasal excess
    vq_score = _clamp(
        (
            warmth
            + resonance
            + richness
            + projection
            + control
            + stability
            + (100 - breathiness)
            + (100 - tension)
            + (100 - min(100, nasal))
        )
        / 9
    )
    weak_vq = sorted(
        [(k, v) for k, v in voice_quality_dims.items() if k not in ("breathiness", "vocal_tension", "vocal_fatigue", "nasal_resonance")],
        key=lambda x: x[1],
    )[:2]
    vq_reason = (
        f"Overall voice quality estimate {vq_score}/100. "
        f"Strongest traits lean on warmth {warmth}, resonance {resonance}, projection {projection}. "
    )
    if weak_vq:
        vq_reason += f"Priority lift: {weak_vq[0][0].replace('_', ' ')} ({weak_vq[0][1]})."

    if projection < 58:
        findings.append(
            _finding(
                kind="weak_projection",
                observation="Speaking projects too softly for executive distance.",
                cause="Likely throat effort or low breath support instead of forward placement.",
                evidence=f"Projection estimate {projection}; volume consistency {acoustics.get('volume_consistency')}.",
                impact="Listeners strain; authority and conviction drop in rooms or calls.",
                fix="Speak to the far wall using diaphragmatic support — never shout; keep end-of-sentence volume.",
                exercise="projection_support",
                expected="+10 Projection, +6 Authority",
                end=min(30.0, duration),
                severity=0.55,
            )
        )
    if resonance < 55 or chest < 50:
        findings.append(
            _finding(
                kind="low_resonance",
                observation="Voice sounds thinner — limited chest resonance (estimate).",
                cause="Sound is staying higher/throatier with less facial/chest vibration.",
                evidence=f"Resonance {resonance}, chest resonance {chest}, spectral centroid ~{acoustics.get('spectral_centroid_hz')} Hz.",
                impact="Warmth and presence fall; long talks feel less grounded.",
                fix="Hum into the chest, then open to speech while keeping that vibration.",
                exercise="chest_resonance",
                expected="+10 Resonance, +8 Warmth",
                end=min(20.0, duration),
                severity=0.5,
            )
        )

    # Pitch analysis
    pitch_mean = float(acoustics.get("pitch_mean") or 0)
    pitch_range_hz = float(acoustics.get("pitch_range_hz") or 0)
    pitch_stab = float(acoustics.get("pitch_stability") or 0)
    pitch_var = float(acoustics.get("pitch_variation") or 0)
    monotone = float(acoustics.get("monotone_score") or 0)
    fry = float(acoustics.get("vocal_fry_est") or 0)

    pitch_block = {
        "average_pitch_hz": pitch_mean,
        "pitch_range_hz": pitch_range_hz,
        "pitch_stability": pitch_stab,
        "pitch_variation": pitch_var,
        "monotone_score": monotone,
        "vocal_fry_est": fry,
        "intonation_quality": _clamp(100 - monotone * 0.7 + min(40, pitch_range_hz) * 0.5),
        "timeline": acoustics.get("pitch_timeline") or [],
        "summary": (
            f"Average pitch ~{pitch_mean:.0f} Hz with ~{pitch_range_hz:.0f} Hz range. "
            + (
                f"Pitch varies only ~{pitch_range_hz:.0f} Hz, so long explanations can sound flat — "
                "raise variation slightly when introducing key ideas."
                if pitch_range_hz < 25 or monotone > 65
                else "Pitch variety is usable; keep authentic emphasis on key claims."
            )
        ),
        "note": "Pitch values are estimates from acoustic tracking.",
    }
    if pitch_range_hz < 25 or monotone > 65:
        findings.append(
            _finding(
                kind="monotone",
                observation="Delivery trends monotone across the session.",
                cause="Limited intonation on key ideas — not a need to fake a different voice.",
                evidence=f"Pitch range ~{pitch_range_hz:.0f} Hz; monotone estimate {monotone}.",
                impact="Long explanations lose engagement and emphasis.",
                fix="Mark one keyword per sentence; allow a slight authentic pitch rise only there.",
                exercise="emphasis_keywords",
                expected="Monotone −12, Storytelling +8",
                end=min(25.0, duration),
                severity=0.55,
            )
        )

    # Resonance placement label
    if nasal > 55 and nasal > chest:
        placement = "Nasal dominance (estimate)"
        res_ex = "open_vowels"
    elif chest >= 60 and throat < 55:
        placement = "Chest-forward / balanced (estimate)"
        res_ex = "warmup_hum"
    elif throat >= 60:
        placement = "Mostly throat voice (estimate)"
        res_ex = "lip_trills"
    else:
        placement = "Mixed / developing balance (estimate)"
        res_ex = "chest_resonance"

    resonance_block = {
        "placement": placement,
        "chest_resonance": chest,
        "nasal_resonance": nasal,
        "throat_dominance": throat,
        "vocal_resonance": resonance,
        "recommendation": (
            "Humming + chest resonance drills"
            if chest < 55 or resonance < 58
            else "Maintain balance; avoid forcing brightness"
        ),
        "exercise": res_ex,
        "note": "Resonance placement is a spectral/acoustic estimate.",
    }

    # Executive presence composite
    clarity_s = float(clarity.get("clarity") or 60)
    pause_q = float(pauses.get("pause_quality") or 50)
    conf = float(acoustics.get("confidence_est") or 55)
    energy_cons = float(acoustics.get("volume_consistency") or 55)
    variety = _clamp(100 - monotone)
    tech = _clamp(clarity_s * 0.7 + max(0, 100 - abs(float(pace.get("wpm") or 140) - 135)) * 0.3)
    rhythm = _clamp(pause_q * 0.5 + (100 - min(100, abs(float(pace.get("pace_variation") or 20)))) * 0.3 + conf * 0.2)

    ep_parts = {
        "vocal_stability": stability,
        "speaking_rhythm": rhythm,
        "authority": _clamp(conf * 0.35 + projection * 0.35 + stability * 0.3),
        "confidence": conf,
        "pause_control": pause_q,
        "clarity": clarity_s,
        "projection": projection,
        "sentence_completion": _clamp(clarity_s * 0.6 + projection * 0.4),
        "energy_consistency": energy_cons,
        "vocal_variety": variety,
        "technical_communication": tech,
    }
    ep_score = _clamp(sum(ep_parts.values()) / len(ep_parts))
    ep_sorted = sorted(ep_parts.items(), key=lambda x: x[1])
    biggest_weak = ep_sorted[0]
    fastest = ep_sorted[0]  # same for now — lowest is fastest lift with focused drill
    potential = _clamp(ep_score + min(18, (100 - biggest_weak[1]) * 0.35))

    executive = {
        "score": ep_score,
        "breakdown": ep_parts,
        "biggest_weakness": {
            "key": biggest_weak[0],
            "label": biggest_weak[0].replace("_", " ").title(),
            "score": biggest_weak[1],
            "why": f"{biggest_weak[0].replace('_', ' ').title()} is the lowest contributor at {biggest_weak[1]}.",
        },
        "fastest_improvement": {
            "key": fastest[0],
            "label": fastest[0].replace("_", " ").title(),
            "habit": "One focused Labs drill daily targeting this dimension.",
        },
        "potential_after_practice": potential,
        "reason": (
            f"Executive Presence {ep_score} from stability, rhythm, authority, confidence, pauses, "
            f"clarity, projection, completion, energy, variety, and technical clarity. "
            f"Biggest gap: {biggest_weak[0].replace('_', ' ')} ({biggest_weak[1]}). "
            f"Realistic near-term potential ~{potential} with consistent practice."
        ),
        "note": "Estimate — not a personality judgment.",
    }

    authority = {
        "score": ep_parts["authority"],
        "reasons": [
            f"{'Strong' if float(pace.get('wpm') or 140) < 155 else 'Rushed'} pace (~{pace.get('wpm')} WPM).",
            f"{'Steady' if stability >= 60 else 'Unsteady'} vocal stability ({stability}).",
            f"{'Solid' if projection >= 65 else 'Low'} projection ({projection}).",
            f"{'Clear' if clarity_s >= 70 else 'Soft/unclear'} sentence endings / clarity ({clarity_s}).",
            f"Conviction estimate {acoustics.get('conviction_est')}.",
        ],
        "improvement_plan": "Finish consonants at phrase ends; hold volume through the last word; plant one pause before the ask.",
    }

    trust = {
        "score": _clamp(
            stability * 0.25
            + energy_cons * 0.2
            + float(acoustics.get("calmness_est") or 55) * 0.2
            + warmth * 0.15
            + clarity_s * 0.2
        ),
        "reason": (
            f"Trust leans on stability ({stability}), consistency ({energy_cons}), "
            f"calmness ({acoustics.get('calmness_est')}), warmth ({warmth}), clarity ({clarity_s})."
        ),
        "improvement_plan": "Slow technical sections; keep volume even; finish words; avoid filler spikes.",
    }

    emotion = {
        "calmness": acoustics.get("calmness_est"),
        "nervousness": acoustics.get("nervousness_est"),
        "excitement": acoustics.get("excitement_est"),
        "stress": acoustics.get("stress_est"),
        "enthusiasm": acoustics.get("enthusiasm_est"),
        "confidence": acoustics.get("confidence_est"),
        "hesitation": _clamp(float(acoustics.get("nervousness_est") or 30) * 0.6 + float(pace.get("pace_variation") or 10) * 0.4),
        "timeline": acoustics.get("emotion_timeline") or [],
        "note": "Emotional labels are acoustic estimates, not clinical assessments.",
    }

    breath_freq = float(acoustics.get("breath_frequency") or 0)
    empty_breath = breath_freq > 18 or (float(pace.get("wpm") or 0) > 155 and pause_q < 55)
    breath = {
        "breath_frequency": breath_freq,
        "breath_timing": "Frequent shallow recovery" if breath_freq > 16 else "Generally usable",
        "talking_without_enough_air": empty_breath,
        "running_out_of_breath": empty_breath and float(pace.get("wpm") or 0) > 150,
        "audible_breaths_est": breathiness > 55,
        "impact_on_clarity": (
            "Rushing on low air compresses consonants and drops endings."
            if empty_breath
            else "Breath support is adequate enough not to dominate clarity issues."
        ),
        "fix": "Plan a breath before each claim; practice diaphragm support for 2 minutes.",
        "exercise": "breath_diaphragm",
        "note": "Breath metrics are estimates from energy valleys / spectral cues.",
    }
    if empty_breath:
        findings.append(
            _finding(
                kind="speaking_on_empty_breath",
                observation="Breath timing is undermining clarity (estimate).",
                cause="Speaking through dense sections without planned inhalation.",
                evidence=f"Breath frequency ~{breath_freq:.1f}/min; pause quality {pause_q}; WPM {pace.get('wpm')}.",
                impact="Endings mumble; pitch and projection wobble late in phrases.",
                fix="Mark breath points before claims; finish the phrase on remaining air, then inhale.",
                exercise="breath_diaphragm",
                expected="+12 Breathing Quality, +6 Clarity",
                severity=0.55,
                end=min(40.0, duration),
            )
        )

    # Articulation / hard words
    hard_words: list[dict[str, Any]] = []
    seen: dict[str, dict[str, Any]] = {}
    for e in clarity.get("events") or []:
        if e.get("kind") != "pronunciation_issue":
            continue
        meta = e.get("meta") or {}
        w = (meta.get("word") or "").strip()
        if len(w) < 4:
            continue
        key = w.lower()
        prev = seen.get(key) or {"word": w, "count": 0, "timestamps": [], "avg_confidence": 1.0}
        prev["count"] += 1
        prev["timestamps"].append(e.get("start"))
        conf_w = float(meta.get("probability") or 0.4)
        prev["avg_confidence"] = round(((prev["avg_confidence"] * (prev["count"] - 1)) + conf_w) / prev["count"], 3)
        seen[key] = prev
    hard_words = sorted(seen.values(), key=lambda x: (-x["count"], x["avg_confidence"]))[:15]

    articulation = {
        "clarity": clarity_s,
        "dropped_endings_est": len(hard_words) > 0,
        "mumbled_technical_terms": [h["word"] for h in hard_words[:8]],
        "practice_list": [h["word"] for h in hard_words[:10]],
        "guidance": (
            "Do NOT change your accent. Improve clarity by finishing consonants and syllables — "
            "especially on technical terms."
            if hard_words
            else "Keep finishing consonants; no accent-change goals."
        ),
        "exercise": "hard_word_ladder" if hard_words else "consonant_finish",
        "items": hard_words,
    }
    if hard_words:
        findings.append(
            _finding(
                kind="drop_technical_endings",
                observation="Technical / multi-syllable words lose clarity.",
                cause="Articulation speed rises while explaining complex terms.",
                evidence=f"Unclear terms include: {', '.join(h['word'] for h in hard_words[:5])}.",
                impact="Listeners need more effort; technical authority drops.",
                fix="Practice the list slow → normal → presentation speed; over-finish final consonants.",
                exercise="hard_word_ladder",
                expected="+12 Clarity, +8 Executive Presence",
                start=float(hard_words[0]["timestamps"][0] or 0),
                end=float(hard_words[0]["timestamps"][0] or 0) + 2,
                severity=0.6,
            )
        )

    # Projection label
    if projection < 55:
        proj_label = "Speaking too softly"
    elif projection > 88 and float(acoustics.get("energy") or 0) > 12:
        proj_label = "Possible over-projection / push"
    else:
        proj_label = "Good projection range (estimate)"

    projection_block = {
        "score": projection,
        "label": proj_label,
        "fix": "Use breath support for distance; avoid shouting or fading at endings.",
        "exercise": "projection_support",
    }

    # Listener fatigue / comfortable listening time
    mono_pen = monotone
    pace_pen = max(0, float(pace.get("wpm") or 140) - 150) * 2
    pause_pen = max(0, 70 - pause_q)
    energy_pen = max(0, 55 - energy_cons)
    fatigue_index = _clamp(mono_pen * 0.35 + pace_pen * 0.2 + pause_pen * 0.25 + energy_pen * 0.2)
    if fatigue_index < 30:
        comfort = 60
    elif fatigue_index < 45:
        comfort = 30
    elif fatigue_index < 60:
        comfort = 15
    else:
        comfort = 5

    listener = {
        "fatigue_index": fatigue_index,
        "comfortable_listening_minutes": comfort,
        "options": [5, 15, 30, 60],
        "why": (
            f"Estimated comfortable listening ~{comfort} min. Driven by monotony ({monotone}), "
            f"pace ({pace.get('wpm')} WPM), pause quality ({pause_q}), energy consistency ({energy_cons})."
        ),
    }

    persuasiveness = {
        "score": _clamp(
            float(acoustics.get("conviction_est") or 55) * 0.3
            + conf * 0.25
            + variety * 0.2
            + pause_q * 0.15
            + warmth * 0.1
        ),
        "conviction": acoustics.get("conviction_est"),
        "storytelling": _clamp(pause_q * 0.4 + variety * 0.35 + conf * 0.25),
        "where_lost": (
            "Persuasion dips when pace rises and endings soften on technical claims."
            if float(pace.get("wpm") or 0) > 150 or hard_words
            else "Keep emphasis on key claims; persuasion is reasonably intact."
        ),
    }

    # Accent clarity policy note
    accent_clarity = {
        "policy": "We never attempt accent reduction. We only improve clarity of consonants, endings, and pacing.",
        "focus": articulation["practice_list"][:8],
        "example": (
            f"The final consonants in words like '{hard_words[0]['word']}' are inconsistently clear."
            if hard_words
            else "No major unclear technical terms detected this session."
        ),
    }

    # Enrich findings already produced with weekly trend placeholder
    for f in findings:
        f["weekly_trend"] = "Track after 3+ sessions in Voice Memory / Coach profile."

    return {
        "voice_quality": {
            "score": vq_score,
            "dimensions": voice_quality_dims,
            "reasoning": vq_reason,
            "note": acoustics.get("note"),
        },
        "pitch": pitch_block,
        "resonance": resonance_block,
        "executive_presence": executive,
        "authority": authority,
        "trustworthiness": trust,
        "emotion": emotion,
        "breath": breath,
        "articulation": articulation,
        "projection": projection_block,
        "listener_fatigue": listener,
        "persuasiveness": persuasiveness,
        "accent_clarity": accent_clarity,
        "findings": findings,
        "one_habit_next": (
            findings[0]["fix"]
            if findings
            else "Keep one habit: finish every word clearly at a calm executive pace."
        ),
        "expected_if_fixed": findings[0].get("expected_improvement") if findings else "+5 Clarity (habit consistency)",
    }
