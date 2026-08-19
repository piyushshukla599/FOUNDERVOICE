# 06 — API reference

Base URL: `http://127.0.0.1:8000`  
All app routes below are under `/api` unless noted.

Source: `apps/api/app/main.py` + `routers/*`.

---

## Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ ok, product, deepseek_configured, whisper_model }` |

---

## Sessions — `/api/sessions`

| Method | Path | Body / params | Response / notes |
|--------|------|---------------|------------------|
| GET | `/api/sessions` | — | List with joined metric highlights |
| GET | `/api/sessions/{id}` | — | `{ session, metrics, events, lab_recs }` — `lab_recs` from this session’s findings, or similar labs after `mode=exercise` |
| POST | `/api/sessions/upload` | multipart: `file`, `title`, `mode`, optional `exercise_key`, `exercise_title`, `exercise_category`, `exercise_description`, `focus_note` | `{ session_id, status, mode }` — pipeline in background |
| POST | `/api/sessions/{id}/reanalyze` | — | Reset + re-run pipeline |
| GET | `/api/sessions/{id}/audio` | — | Audio file (supports range) |
| GET | `/api/sessions/{id}/report` | — | PDF |
| DELETE | `/api/sessions/{id}` | — | Deletes DB rows + audio file |

---

## Listening — `/api/listening`

| Method | Path | Body / params | Notes |
|--------|------|---------------|-------|
| GET | `/api/listening/active` | — | `{ active: false }` or active session payload |
| GET | `/api/listening` | — | Recent listening sessions (limit 50) |
| POST | `/api/listening/start` | JSON: `title`, `device_label`, `speech_start_sec` (default 3.5), `silence_end_sec` (4.0), `min_conversation_sec` (8.0), `min_speech_ratio` (0.2) | **409** if one already active |
| GET | `/api/listening/{id}` | — | `{ listening, conversations, analyzing }` |
| POST | `/api/listening/{id}/conversations` | multipart clip + index | Creates child session `mode=listening`, runs pipeline |
| POST | `/api/listening/{id}/end` | — | Builds summary via `listening_summary` (includes `lab_recs`, pending verdict) |
| POST | `/api/listening/{id}/verdict` | JSON `{ exercise_session_id? }` | Founder Voice Verdict after a Labs `mode=exercise` session |

VAD itself is **client-side**; server stores settings and processes uploaded clips.

---

## Memory / coach program — `/api` (memory router)

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/api/memory` | — | Memory snapshot + voice profile |
| GET | `/api/dashboard` | — | Memory + `dashboard_series` + profile |
| GET | `/api/voice-program` | — | Full training program |
| POST | `/api/voice-goal` | `{ goal_key }` | 400 if unknown goal |
| POST | `/api/daily-mission/complete` | — | Completes today’s mission |
| GET | `/api/exercises` | — | Exercises + `speak` / `how` / `sense` / `similar` / `sound` / `fix_line`; `recommended`; streak; mission; plan |
| POST | `/api/exercises/{key}/complete` | query `notes` | Returns `{ error: "not found" }` **without** HTTP 404 if missing |
| GET | `/api/fillers` | — | Builtin + custom filler lexicon |
| POST | `/api/fillers` | `{ phrase }` | Add custom filler |
| DELETE | `/api/fillers/{phrase}` | — | Remove custom |
| POST | `/api/fresh-start` | `{ confirm: "DELETE" }` | Destructive wipe |

---

## Practice — `/api/practice`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/practice/start` | `{ pitch_context, session_id? }` | First investor question (DeepSeek or hardcoded fallback) |
| POST | `/api/practice/turn` | `{ pitch_context, history, founder_message, session_id? }` | Continues Q&A; may persist turns |
| GET | `/api/practice/history` | `limit` default 40 | Past turns |

---

## Contact — `/api/contact`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/contact` | name, email, phone, company, message, interest | Local save + optional SMTP |

---

## CORS

`CORS_ORIGINS` (comma-separated) **plus** `allow_origin_regex` for `http://localhost:<port>` and `http://127.0.0.1:<port>` so Next.js on 3001/3002 can call the API. Restart uvicorn after changing CORS. If the origins list is empty after parse, middleware falls back to `["*"]` (`main.py`).
