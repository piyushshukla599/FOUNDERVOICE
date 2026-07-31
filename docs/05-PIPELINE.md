# 05 — Analysis pipeline

Entry: `apps/api/app/services/pipeline.py` → `run_pipeline(session_id, mode)`.

Triggered by upload (background task), listening conversation upload, or `POST …/reanalyze`.

## Ordered steps

1. Load session row; parse `focus_json` / `exercise_key`; set status **`analyzing`**.
2. **Normalize audio** → `data/audio/{session_id}.wav` (`audio.ensure_wav_mono_16k`).
3. **Load samples** (`audio.load_audio`).
4. **Whisper** (`whisper_asr.transcribe`) → text, words, sentences, duration.  
   On failure → demo transcript (`engine: "demo-fallback"`) + warning.
5. **Pace** `analysis.analyze_pace(words, duration)`.
6. **Fillers** `analysis.detect_fillers(words, duration)`.
7. **Pauses** `analysis.analyze_pauses(y, sr, words)`.
8. **Base acoustics** `analysis.analyze_acoustics(y, sr)`.
9. **Enhance acoustics** `advanced_voice.enhance_acoustics(y, sr, acoustics)`.
10. **Clarity** `analysis.pronunciation_and_clarity(words)`.
11. **Professional report** `advanced_voice.build_professional_report(...)`.
12. **Language insights** `deepseek.language_insights` (LLM or heuristic fallback).
13. **Pitch / investor JSON** `deepseek.analyze_pitch_with_llm` (LLM or fallback).
14. **Merge events** from pace, fillers, pauses, acoustics, clarity, professional findings; optional heuristic `confidence_drop` if WPM &gt; 150 and confidence &lt; 55.
15. Build **metrics** row + `payload_json`.
16. **Voice profile** update (EMA).
17. **Voice memory** pattern update.
18. **Training plan** rebuild + ensure daily mission + settings.
19. **Coach summary** `deepseek.generate_coach_summary` (LLM or `_fallback_coach`).
20. Write `data/transcripts/{session_id}.json`.
21. Persist session **`ready`**, replace metrics, replace events.

On exception: status **`error`**, `error = str(exc)`.

## Upload accepted extensions

From sessions router: `.wav`, `.mp3`, `.m4a`, `.flac`, `.webm`, `.ogg`, `.mpeg`, `.mp4`.

## Thresholds / constants (from code)

### Pace (`analysis.py`)

- Sliding windows: **8s** window, **4s** step
- Too-fast event threshold: **160 WPM**
- Effective speaking gaps: &lt; **0.5s**

### Fillers

Tokens include: um, uh, uhm, like, basically, actually, literally, you know, kind of, sort of, right, **and** (as listed in detector).

### Pauses

- Silence RMS: median × **0.35**; min pause **0.25s**
- Thinking gap between words ≥ **0.45s**
- Long pause ≥ **2.0s**
- Missing pause: continuous speech &gt; **12s** without gap ≥ **0.35s**

### Clarity

- Low-confidence word: probability &lt; **0.55** → pronunciation-style events

### Acoustics (base)

- Volume consistency &lt; **55** → event
- Monotone score &gt; **70** → event
- Pitch track fmin **60**, fmax **400**

### Professional findings (`advanced_voice.py`)

Examples:

- Projection &lt; **58** → `weak_projection`
- Resonance &lt; **55** or chest &lt; **50** → `low_resonance`
- Pitch range &lt; **25** Hz or monotone &gt; **65** → `monotone`
- Breath: freq &gt; **18**, or WPM &gt; **155** with pause quality &lt; **55**

Listener comfort minutes: **60 / 30 / 15 / 5** by fatigue index bands (&lt;30 / &lt;45 / &lt;60 / else).

### Voice profile

EMA alpha **0.35** (`voice_profile.py`).

### Training weaknesses

See `WEAKNESS_CATALOG` in `training_program.py` (e.g. projection thresholds 62 / 55, articulation 70, monotone_level ≥ 55 with `inverse`, pattern-assisted keys when pattern frequency ≥ 2).

## Professional payload shape

`metrics.payload.professional` top-level keys from `build_professional_report`:

`voice_quality`, `pitch`, `resonance`, `executive_presence`, `authority`, `trustworthiness`, `emotion`, `breath`, `articulation`, `projection`, `listener_fatigue`, `persuasiveness`, `accent_clarity`, `findings`, `one_habit_next`, `expected_if_fixed`.

Accent policy in code: improve clarity of consonants/endings — **not** accent reduction.

## Whisper details

- Model cached with `@lru_cache`
- `word_timestamps=True`, `vad_filter=True`, `beam_size=5`
- Download root: `data/models`

## Behavioral flags in payload

Currently hardcoded in pipeline:

```python
"reading_from_script_est": False,
"natural_conversation_est": True,
```

with a note that they are heuristic estimates — not a real classifier.
