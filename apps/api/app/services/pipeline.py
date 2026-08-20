from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from ..config import get_settings
from ..db import connect, dumps, loads, utc_now
from . import advanced_voice, analysis, asr, audio, coach_templates, deepseek, filler_lexicon, lab_coach, training_program, voice_memory, voice_profile


async def run_pipeline(session_id: str, mode: str = "free") -> dict[str, Any]:
    settings = get_settings()
    with connect() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            raise ValueError("Session not found")
        audio_path = Path(row["audio_path"])
        focus = loads(row["focus_json"] if "focus_json" in row.keys() else None, {}) or {}
        exercise_key = row["exercise_key"] if "exercise_key" in row.keys() else None
        session_mode = row["mode"] or mode
        conn.execute("UPDATE sessions SET status=? WHERE id=?", ("analyzing", session_id))
        conn.commit()

    session_context = {
        "mode": session_mode,
        "exercise_key": exercise_key,
        "focus": focus,
    }

    try:
        wav_path = settings.audio_dir / f"{session_id}.wav"
        audio.ensure_wav_mono_16k(audio_path, wav_path)
        y, sr = audio.load_audio(wav_path)
        transcript = asr.transcribe(wav_path)
        words = transcript.get("words") or []
        duration = float(transcript.get("duration") or (len(y) / sr))

        pace = analysis.analyze_pace(words, duration)
        custom_fillers = filler_lexicon.list_custom()
        fillers = analysis.detect_fillers(words, duration, extra_phrases=custom_fillers)
        pauses = analysis.analyze_pauses(y, sr, words)
        acoustics = analysis.analyze_acoustics(y, sr)
        acoustics = advanced_voice.enhance_acoustics(y, sr, acoustics)
        clarity = analysis.pronunciation_and_clarity(words)
        professional = advanced_voice.build_professional_report(
            acoustics=acoustics,
            pace=pace,
            pauses=pauses,
            clarity=clarity,
            words=words,
            duration=duration,
        )

        settings = get_settings()
        light_listening = session_mode == "listening" and settings.listening_light_analysis
        use_enhanced = (
            settings.coach_mode == "enhanced"
            and settings.deepseek_api_key
            and not settings.deepseek_api_key.startswith("sk-your")
        )

        if light_listening or not use_enhanced:
            lang = coach_templates.build_language_insights(transcript.get("text") or "")
            base_metrics = {
                "wpm": pace["wpm"],
                "clarity": clarity["clarity"],
                "confidence_est": acoustics["confidence_est"],
                "filler_count": fillers["filler_count"],
                "executive_presence": (professional.get("executive_presence") or {}).get("score"),
            }
            pitch = coach_templates.build_pitch_scores(
                base_metrics, transcript.get("text") or ""
            )
        else:
            lang = await deepseek.language_insights(transcript.get("text") or "")
            base_metrics = {
                "wpm": pace["wpm"],
                "clarity": clarity["clarity"],
                "confidence_est": acoustics["confidence_est"],
                "filler_count": fillers["filler_count"],
            }
            pitch = await deepseek.analyze_pitch_with_llm(
                transcript.get("text") or "", base_metrics
            )
            if session_mode != "pitch":
                pitch = coach_templates.build_pitch_scores(
                    {**base_metrics, "executive_presence": (professional.get("executive_presence") or {}).get("score")},
                    transcript.get("text") or "",
                )

        events: list[dict[str, Any]] = []
        events.extend(pace.get("speed_events") or [])
        events.extend(fillers.get("events") or [])
        events.extend(pauses.get("events") or [])
        events.extend(acoustics.get("events") or [])
        events.extend(clarity.get("events") or [])
        events.extend(professional.get("findings") or [])

        # behavioral heuristics
        if pace["wpm"] > 150 and acoustics["confidence_est"] < 55:
            events.append(
                {
                    "kind": "confidence_drop",
                    "start": 0,
                    "end": min(30, duration),
                    "severity": 0.5,
                    "label": "Fast + low confidence (estimate)",
                    "cause": "Rushing while uncertain often compresses articulation.",
                    "fix": "Slow the first 20 seconds; plant feet; emphasize the ask.",
                    "exercise": "confidence_stance",
                    "observation": "Fast + low confidence (estimate)",
                    "evidence": f"WPM {pace['wpm']}, confidence {acoustics['confidence_est']}.",
                    "impact": "Listeners hear urgency without conviction.",
                    "expected_improvement": "+8 Confidence, +5 Authority",
                    "meta": {},
                }
            )

        # Prefer professional executive presence over investor LLM ceo_presence alone
        exec_score = (professional.get("executive_presence") or {}).get("score")
        auth_score = (professional.get("authority") or {}).get("score")
        trust_score = (professional.get("trustworthiness") or {}).get("score")

        metrics = {
            "wpm": pace["wpm"],
            "articulation_rate": pace["articulation_rate"],
            "effective_speaking_rate": pace["effective_speaking_rate"],
            "pace_variation": pace["pace_variation"],
            "fastest_section_start": (pace["fastest_section"] or {}).get("start"),
            "fastest_section_end": (pace["fastest_section"] or {}).get("end"),
            "slowest_section_start": (pace["slowest_section"] or {}).get("start"),
            "slowest_section_end": (pace["slowest_section"] or {}).get("end"),
            "filler_count": fillers["filler_count"],
            "filler_rate": fillers["filler_rate"],
            "avg_pause_duration": pauses["avg_pause_duration"],
            "longest_pause": pauses["longest_pause"],
            "pause_quality": pauses["pause_quality"],
            "clarity": clarity["clarity"],
            "pitch_mean": acoustics["pitch_mean"],
            "pitch_stability": acoustics["pitch_stability"],
            "pitch_variation": acoustics["pitch_variation"],
            "loudness_mean": acoustics["loudness_mean"],
            "volume_consistency": acoustics["volume_consistency"],
            "energy": acoustics["energy"],
            "confidence_est": acoustics["confidence_est"],
            "stress_est": acoustics["stress_est"],
            "monotone_score": acoustics["monotone_score"],
            "breath_frequency": acoustics["breath_frequency"],
            "vocabulary_diversity": lang.get("vocabulary_diversity"),
            "avg_sentence_length": lang.get("avg_sentence_length"),
            "grammar_score": lang.get("grammar_score"),
            "readability": lang.get("readability"),
            "hook_strength": pitch.get("hook_strength"),
            "problem_clarity": pitch.get("problem_clarity"),
            "solution_clarity": pitch.get("solution_clarity"),
            "moat_clarity": pitch.get("moat_clarity"),
            "traction_clarity": pitch.get("traction_clarity"),
            "closing_effectiveness": pitch.get("closing_effectiveness"),
            "cta_score": pitch.get("cta_score"),
            "ceo_presence": exec_score if exec_score is not None else pitch.get("ceo_presence"),
            "founder_trust": trust_score if trust_score is not None else pitch.get("founder_trust"),
            "fundraising_readiness": pitch.get("fundraising_readiness"),
            "demo_day_readiness": pitch.get("demo_day_readiness"),
            "yc_readiness": pitch.get("yc_readiness"),
            "executive_presence": exec_score if exec_score is not None else pitch.get("ceo_presence"),
            "investor_would_invest": pitch.get("would_invest"),
            "payload_json": dumps(
                {
                    "pace": pace,
                    "fillers": fillers,
                    "pauses": pauses,
                    "acoustics": acoustics,
                    "clarity": clarity,
                    "language": lang,
                    "pitch": pitch,
                    "professional": professional,
                    "authority_score": auth_score,
                    "session_context": session_context,
                    "behavioral": {
                        "reading_from_script_est": False,
                        "natural_conversation_est": True,
                        "note": "Behavioral flags are heuristic estimates.",
                    },
                }
            ),
        }

        # Update Voice Profile before coaching so the summary can cite deltas
        profile = voice_profile.update_voice_profile(
            session_id,
            {k: v for k, v in metrics.items() if k != "payload_json"},
            events,
            acoustics,
        )
        voice_memory.update_voice_memory(session_id, events, metrics)
        training_program.rebuild_training_plan()
        training_program.ensure_daily_mission()
        goal = training_program.ensure_settings()

        memory = voice_memory.get_memory_snapshot()
        coach_ctx = {
            **session_context,
            "professional": {
                "voice_quality": professional.get("voice_quality"),
                "projection": professional.get("projection"),
                "one_habit_next": professional.get("one_habit_next"),
                "expected_if_fixed": professional.get("expected_if_fixed"),
                "executive_presence": professional.get("executive_presence"),
            },
        }
        metric_slice = {k: v for k, v in metrics.items() if k != "payload_json"}
        if light_listening:
            coach = coach_templates.build_listening_collection_note(metric_slice, events)
        elif session_mode == "exercise":
            coach = lab_coach.build_lab_review(
                exercise_key=str(exercise_key or focus.get("exercise_key") or ""),
                title=str(focus.get("exercise_title") or "Labs drill"),
                description=str(focus.get("exercise_description") or ""),
                metrics=metric_slice,
                events=events,
                memory=memory,
            )
        elif use_enhanced:
            coach = await deepseek.generate_coach_summary(
                transcript.get("text") or "",
                metric_slice,
                events,
                memory,
                profile=profile,
                goal=goal,
                session_context=coach_ctx,
            )
            if not coach:
                coach = coach_templates.build_coach_summary(
                    metric_slice,
                    events,
                    memory,
                    profile,
                    session_context=coach_ctx,
                    transcript=transcript.get("text") or "",
                )
        else:
            coach = coach_templates.build_coach_summary(
                metric_slice,
                events,
                memory,
                profile,
                session_context=coach_ctx,
                transcript=transcript.get("text") or "",
            )

        transcript_path = settings.transcripts_dir / f"{session_id}.json"
        transcript_path.write_text(dumps(transcript), encoding="utf-8")

        with connect() as conn:
            conn.execute(
                """
                UPDATE sessions SET status=?, duration=?, transcript_json=?, coach_summary=?, error=NULL
                WHERE id=?
                """,
                ("ready", duration, dumps(transcript), coach, session_id),
            )
            cols = [k for k in metrics.keys()]
            placeholders = ",".join(["?"] * (len(cols) + 1))
            col_sql = ",".join(["session_id"] + cols)
            conn.execute(f"DELETE FROM metrics WHERE session_id=?", (session_id,))
            conn.execute(
                f"INSERT INTO metrics ({col_sql}) VALUES ({placeholders})",
                [session_id] + [metrics[c] for c in cols],
            )
            conn.execute("DELETE FROM events WHERE session_id=?", (session_id,))
            for e in events:
                meta = dict(e.get("meta") or {})
                for key in ("observation", "evidence", "impact", "expected_improvement", "weekly_trend"):
                    if e.get(key) is not None:
                        meta[key] = e.get(key)
                conn.execute(
                    """
                    INSERT INTO events (session_id, kind, start, end, severity, label, cause, fix, exercise, meta_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        session_id,
                        e.get("kind"),
                        e.get("start"),
                        e.get("end"),
                        e.get("severity"),
                        e.get("label"),
                        e.get("cause"),
                        e.get("fix"),
                        e.get("exercise"),
                        dumps(meta),
                    ),
                )
            conn.commit()

        return {"session_id": session_id, "status": "ready", "warning": transcript.get("warning")}
    except Exception as exc:  # noqa: BLE001
        with connect() as conn:
            conn.execute(
                "UPDATE sessions SET status=?, error=? WHERE id=?",
                ("error", str(exc), session_id),
            )
            conn.commit()
        raise


def create_session(audio_path: Path, title: str | None, mode: str) -> str:
    session_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions (id, created_at, title, mode, audio_path, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (session_id, utc_now(), title or "Untitled session", mode, str(audio_path), "pending"),
        )
        conn.commit()
    return session_id
