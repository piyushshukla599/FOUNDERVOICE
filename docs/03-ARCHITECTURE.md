# 03 — Architecture

## High-level

```
┌─────────────────┐         HTTP JSON / multipart          ┌──────────────────┐
│  apps/web       │ ─────────────────────────────────────► │  apps/api        │
│  Next.js :3000  │ ◄───────────────────────────────────── │  FastAPI :8000   │
└─────────────────┘                                        └────────┬─────────┘
                                                                    │
                     Local only                                     ▼
                                              ┌─────────────────────────────────┐
                                              │ data/foundervoice.db (SQLite)    │
                                              │ data/audio, transcripts,        │
                                              │ reports, models (Whisper)       │
                                              └─────────────────────────────────┘
                                                                    │
                     Optional cloud (text only)                     ▼
                                              ┌─────────────────────────────────┐
                                              │ DeepSeek Chat API               │
                                              │ (coach / pitch JSON / language  │
                                              │  / practice investor replies)   │
                                              └─────────────────────────────────┘
```

## Backend entry

- `app/main.py`: FastAPI app, CORS, mounts routers under `/api`, defines `GET /api/health`.
- **No lifespan hook.** `init_db()` runs at **import time**.
- SSL: `ssl_fix` + `truststore` for outbound HTTPS (DeepSeek).

## Routers

| Module | Prefix | Responsibility |
|--------|--------|----------------|
| `routers/sessions.py` | `/api/sessions` | Upload, list, detail, audio, PDF, reanalyze, delete |
| `routers/listening.py` | `/api/listening` | Smart Session lifecycle + conversation uploads |
| `routers/memory.py` | `/api` | Memory, dashboard, exercises, voice program, fresh start |
| `routers/practice.py` | `/api/practice` | Investor Q&A turns |

## Core services

| Service | File | Role |
|---------|------|------|
| Pipeline | `services/pipeline.py` | Orchestrates one session analysis end-to-end |
| Audio | `services/audio.py` | Normalize to mono 16 kHz WAV; load samples |
| Whisper | `services/whisper_asr.py` | Local ASR + demo fallback |
| Analysis | `services/analysis.py` | Pace, fillers, pauses, base acoustics, clarity |
| Advanced voice | `services/advanced_voice.py` | Extra acoustics + `professional` report |
| DeepSeek | `services/deepseek.py` | LLM calls + rule fallbacks |
| Voice memory | `services/voice_memory.py` | Pattern table + dashboard series + streak |
| Voice profile | `services/voice_profile.py` | EMA profile + hard words |
| Training program | `services/training_program.py` | Goals, weaknesses, plan, daily mission |
| Listening summary | `services/listening_summary.py` | Aggregate when Smart Session ends |
| PDF | `services/report_pdf.py` | Session PDF |

## Frontend architecture

- App Router under `src/app/*`
- Shared shell: `AppShell.tsx` (sidebar + mobile nav)
- API client: `src/lib/api.ts` → FastAPI
- Recording:
  - Record page: MediaRecorder + optional Live Coach (`useLiveCoach`)
  - Labs/Practice: `usePracticeRecorder` + `PracticeRecorderBar`
  - Smart Session: browser VAD (`smartVad.ts`) + `useSmartSession` — **VAD runs in the browser**; API only stores settings and receives clips

## Privacy / local-first boundary

| Stays local | May leave machine |
|-------------|-------------------|
| Mic capture, WAV/MP3 uploads | DeepSeek requests: transcript excerpts + metrics JSON |
| Whisper inference | |
| SQLite + audio files | |
| Browser Live Coach / Smart VAD | |

There is **no** implemented public multi-tenant cloud deployment in this repo.

## Upload size

- API: `max_upload_bytes` = 100 MB
- Web: `upload.ts` `MAX_UPLOAD_BYTES` = 100 MB
- Next experimental body limit: `100mb`
