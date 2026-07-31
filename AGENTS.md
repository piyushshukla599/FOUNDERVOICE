# FounderVoice AI — Agent Instructions

## Product

**FounderVoice AI** is a local-first AI coach for founders, executives, and public speakers.

Most tools say: *"You spoke too fast."*  
FounderVoice must answer: *"Why did you speak too fast, what caused it, and exactly how do you fix it?"*

**Differentiator: Voice Memory** — not one-off analysis. Learn the user's speaking patterns across weeks/months and coach from *their* history (trends, recurring weaknesses, personalized exercises).

Audio, transcripts, Whisper, SQLite, and files stay on the local machine. **Coaching / language / pitch critique / practice interviewer use the DeepSeek API** (text only — never upload raw audio to the cloud).

---

## Non-negotiables

1. **Local audio & ASR** — recordings and Whisper stay on disk; only derived text/metrics may be sent to DeepSeek for coaching.
2. **Causal coaching** — every finding includes: observation → likely cause → concrete fix → practice exercise when possible.
3. **Voice Memory first** — store per-session metrics and longitudinal patterns; never give only generic advice when history exists.
4. **Evidence-linked UI** — every highlight ties to audio timestamps; click → seek/play.
5. **Honest confidence** — label estimates (emotion, breathing, investor scores) as model estimates; never fake precision.
6. **DeepSeek for LLM** — use `DEEPSEEK_API_KEY` + DeepSeek Chat API; fall back to rule templates if the key is missing.

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js, Tailwind CSS, shadcn/ui, Framer Motion, Recharts |
| Backend | FastAPI |
| ASR | Whisper Large V3 (local, via faster-whisper) |
| Coaching LLM | **DeepSeek API** (`deepseek-chat`) |
| Audio | librosa, webrtcvad, ffmpeg; Parselmouth/pyannote optional |
| DB | SQLite |
| Storage | Local filesystem (`./data/audio`, `./data/reports`, `./data/models`) |

---

## Architecture (target)

```
apps/web          → Next.js UI (record, transcript, dashboard, coach, practice)
apps/api          → FastAPI (ingest, analyze, memory, reports, practice)
packages/shared   → shared types / metric schemas (if monorepo)
data/             → SQLite + audio + cached model outputs
```

**Pipeline (per recording):**  
ingest → ffmpeg normalize → VAD / pauses → Whisper (word+sentence timestamps) → acoustic features (librosa/Parselmouth) → language/story/pitch scores → persist metrics → update Voice Memory → generate coaching (LLM or rule templates)

---

## Voice Memory (core data)

Persist for every session and aggregate over time:

- Session: id, created_at, duration, audio_path, transcript_path, mode (pitch|practice|exercise|free)
- Metrics snapshot: WPM, filler_rate, pause_quality, clarity, pitch_stability, confidence_est, investor_scores, section scores (intro/problem/solution/ask)
- Events: timestamped findings (`too_fast`, `filler`, `unclear`, `long_pause`, `confidence_drop`, …) with severity
- Patterns: recurring weaknesses (`rush_on_intro`, `drop_technical_endings`, …) with frequency and trend
- Progress: rolling windows (7d / 30d / 60d) deltas vs baseline

Coach output must cite history when available, e.g.  
*"Your intro WPM averaged 172 → 138 over 60 days (−20%). You still rush in the first 20s when energy spikes."*

---

## Coaching quality bar

Bad: `Speaking rate: 168 WPM (too fast).`  
Good: `You averaged 168 WPM (target ~140). Speed peaked at 0:12–0:28 during the problem statement—likely excitement + no planned pause after the hook. Fix: mark a 0.6–0.8s pause after the hook sentence; practice that section at 130–140 WPM. Exercise: Pause Drill #3 (2 min).`

---

## Phased roadmap (build in order)

### Phase 0 — Skeleton
- Monorepo or `web` + `api` apps
- SQLite schema (sessions, metrics, events, patterns)
- Local file storage + health check
- Empty shell UI: Record | Library | Dashboard | Coach

### Phase 1 — Capture & transcript (MVP core)
- Mic record: start/stop, pause/resume, live waveform
- Upload: drag-drop WAV/MP3/M4A/FLAC
- Whisper Large V3 local: transcript + word/sentence timestamps + confidence
- Smart Transcript: click sentence → play from timestamp
- Basic scores: WPM, fillers (um/uh/like/basically/actually/literally/you know/kind of/sort of/right), silent pauses

### Phase 2 — Acoustic & clarity
- Pace variation, fastest/slowest sections, speed overrun highlights
- Pause types (silent / filled), pause heatmap, missing-pause hints
- Pitch, loudness, energy, volume consistency (Parselmouth/librosa)
- Clarity / low-confidence word highlighting
- PDF report v1 (overall + key charts + coach summary)

### Phase 3 — Voice Memory & personalized coach
- Longitudinal dashboard (7d/30d/60d graphs)
- Recurring pattern detection
- Daily exercises targeting top weaknesses
- Streaks for Voice Trainer warmups

### Phase 4 — Founder pitch & practice
- Storytelling / pitch structure scores (hook, problem, solution, moat, traction, CTA)
- Investor simulation scores (CEO presence, trust, fundraising readiness) as estimates
- AI Practice Mode: local LLM investor that asks hard questions and scores answers
- Push-to-talk, silence auto-stop

### Phase 5 — Advanced (only after 1–4 work offline)
- Optional diarization (pyannote)
- Deeper pronunciation / breathiness / tremor estimates
- Video mode (eye-contact estimation) if camera available
- Full monthly PDF pack

---

## UX principles

- One job per screen; analysis results must feel like a coach, not a metrics dump.
- First-run: record → analyze → show 3 insights max + one exercise (not 40 charts).
- Dashboard is for trends; session view is for timestamped evidence.
- Brand: FounderVoice AI — calm executive tool, not generic AI purple SaaS.

---

## Implementation rules for the agent

1. Ask which **phase** to implement if the user does not specify.
2. Prefer working vertical slices (record → analyze → show one insight) over disconnected scaffolding.
3. Never send raw audio to DeepSeek; only transcripts/metrics for coaching.
4. Keep analysis modules pure and testable (`analyze_pace`, `detect_fillers`, `update_voice_memory`).
5. Every metric written to SQLite must have a schema field and a UI consumer or an explicit "later" comment in the phase plan—no orphan metrics.
6. When adding a finding type, also add: timestamp, severity, cause template, fix template.
7. Prefer `WHISPER_MODEL=large-v3` in production; `base`/`small` are fine for CPU smoke tests.

---

## Definition of done (any feature)

- Works fully offline with sample local audio
- Persists to SQLite / filesystem
- Linked to transcript timestamps when applicable
- Coach text meets the quality bar (observation → cause → fix)
- Updates or reads Voice Memory when relevant
- Basic error states (missing model, bad file, mic denied)
