# 10 — Features & user walkthroughs

Accurate inventory of **what the product does today**, what is **inside** each feature, and **how a user uses it**.  
Source: `apps/web` pages + `apps/api` pipeline/routers. No planned Phase 5 items.

---

## Quick map

| User goal | Go to | Ends up as |
|-----------|-------|------------|
| Practice a pitch / free talk | **Record** `/` | Session `mode` free/pitch/… → `/sessions/{id}` |
| Leave mic on; auto-split talks | **Smart Session** `/listen` | Listening session + child sessions `mode=listening` |
| Find past work | **Library** `/library` | Links to session pages |
| See trends over weeks | **Dashboard** `/dashboard` | 7d / 30d / 60d charts |
| Goals, mission, profile, wipe | **Coach** `/coach` | Memory + training program |
| Timed drills | **Labs** `/trainer` | Session `mode=exercise` → full report |
| Investor Q&A + solo pitch | **Practice** `/practice` | Chat + optional `mode=practice` sessions |

**Shared engine:** almost every uploaded clip runs the **same** analysis pipeline as Record (Whisper → metrics → professional report → coach). Labs/Practice only add **focus metadata** for coaching context.

DeepSeek key: **optional**. Without it, scores/report/findings still work; coach text uses a shorter rule template.

---

## 1. Record (`/`)

### What it is
Main capture screen: mic or file → upload → full evaluation.

### What’s inside
- Mic list / device pick
- Start · Pause/Resume · Stop & analyze · Restart · Discard
- **Push-to-talk** (hold to talk; release stops)
- **Silence auto-stop** — **off by default** (when on: ~6s silence, not in first ~8s)
- **Live Coach** (on by default): browser-side WPM/clarity/breath/presence hints + Voice Memory “ghost” tips — **not** the full server pipeline
- Title + mode select: `pitch` | `practice` | `exercise` | `free`
- Drag-drop / file upload: audio types, max **100 MB**
- Health strip: Whisper model + DeepSeek Ready / Key needed

### User walkthrough
1. Start API + web; open **Record**.
2. Pick mic (or leave default). Set title/mode if you want.
3. Optional: turn Live Coach off; leave auto-stop off for long pitches.
4. **Start** → speak → **Stop & analyze** (or drop a file).
5. App uploads → API creates session (`pending` → `analyzing`) → browser opens **`/sessions/{id}`**.
6. Wait until status is **ready**; read report (below).

### How it works (system)
Browser MediaRecorder → blob → `POST /api/sessions/upload` → background `run_pipeline` → SQLite + audio on disk.

---

## 2. Session report (`/sessions/{id}`)

### What it is
The **result screen** for Record, Labs, Practice uploads, and Smart Session clips. This is where coaching becomes evidence-linked.

### What’s inside (when `ready`)
| Block | Content |
|-------|---------|
| Status / mode banner | `pending` / `analyzing` / `ready` / error; Labs/Practice focus banner |
| Top stats | WPM, fillers, clarity, confidence (est.), pause quality, executive presence, trust, monotone |
| Audio player | Stream from `/api/sessions/{id}/audio` |
| **Professional voice report** | Voice quality dims, pitch chart, resonance, EP breakdown, authority/trust, emotion timeline (seekable), breath, articulation, listener fatigue, persuasiveness, accent-clarity policy, one habit |
| **Smart transcript** | Sentences with timestamps; click → seek/play; findings badges on sentences |
| **Coach summary** | LLM essay **or** rule fallback |
| **Root-cause findings** | Observation / cause / evidence / impact / fix / exercise; click seeks |
| PDF | Download `/api/sessions/{id}/report` |

If analysis failed: red **Analysis error: …**  
If Whisper fell back: yellow **transcript.warning** (demo text).  
Older sessions without `payload.professional`: placeholder asking to re-analyze.

### User walkthrough
1. Land from upload or Library.
2. If “Full evaluation running…” — wait (polls ~2.5s).
3. Play audio; click a transcript sentence or finding to jump to that moment.
4. Read coach + professional panels; optionally download PDF.
5. Use the named exercise on **Labs** / daily mission on **Coach**.

---

## 3. Smart Session (`/listen`, `/listen/[id]`)

### What it is
Long-running **listen mode**: you Start once; the browser detects speech chunks, uploads each as a conversation, and analyzes in the background. Audio stays local.

### What’s inside
- Start / End session
- Settings: preferred/backup mic, timing (`speech_start_sec`, `silence_end_sec`, `min_conversation_sec`, …)
- Mic hot-swap / disconnect backup / “new mic detected” prompts
- Live status: listening / recording a conversation / analyzing previous
- Past listening sessions list
- Detail page: summary + links to each conversation’s `/sessions/{id}`

### User walkthrough
1. Open **Smart Session** → optional Settings → **Start**.
2. Talk naturally (meetings, practice, calls on speaker — whatever you intended).
3. When you stop speaking long enough, a clip saves and uploads; analysis may continue while you keep listening.
4. **End** session → summary built on server.
5. Open session detail → click a conversation → same full session report as Record.

### How it works (system)
- **VAD is in the browser** (`smartVad.ts`), not the API.
- `POST /api/listening/start` stores settings (only one active session).
- Each clip → `POST /api/listening/{id}/conversations` → child session `mode=listening` → same pipeline.
- `POST …/end` → `listening_summary`.

---

## 4. Library (`/library`)

### What it is
Browse all analysis sessions.

### What’s inside
- Filters: **All / Record (free) / Labs (exercise) / Practice / Smart (listening) / Pitch**
- Rows: title, date, mode label, duration, **raw status**, WPM / fillers / clarity
- Auto-refresh ~4s

### User walkthrough
1. Open Library → pick filter if needed.
2. Click a row → `/sessions/{id}`.
3. Use while a new upload is still `analyzing` to watch status flip to `ready`.

---

## 5. Dashboard (`/dashboard`)

### What it is
Longitudinal view of Voice Memory metrics (not a live recorder).

### What’s inside
- Window toggles **7d / 30d / 60d**
- Aggregate insights + WPM and fillers/clarity style charts (Recharts)
- Recurring **patterns** from the `patterns` table

### User walkthrough
1. Record several sessions over days.
2. Open Dashboard → switch windows → read which patterns keep coming back.
3. Jump to Coach/Labs to act on them.

Data from `GET /api/dashboard` (memory + series + profile).

---

## 6. Coach (`/coach`)

### What it is
Program home: mission, goal, profile, plan, hard words, memory, destructive reset.

### What’s inside
- **Today’s mission** (complete button)
- **Goal picker** (10 goals: Executive Presence, Investor Pitch, TED Style, …)
- **Voice profile** scores + deltas vs baseline
- **Development plan** (weaknesses → exercises)
- **Hard words** list from unclear terms across sessions
- Voice Memory insights / patterns / recent sessions
- **Fresh start** (type `DELETE` to wipe data)

### User walkthrough
1. After a few analyzed sessions, open Coach.
2. Set a goal → plan/mission re-prioritize toward that goal.
3. Do the mission exercise in Labs (or mark complete).
4. Watch profile dims move as you keep recording.

Updates come from each pipeline run (`voice_profile`, `training_program`, `voice_memory`).

---

## 7. Labs (`/trainer`)

### What it is
Timed **drills** from the seeded exercise catalog (22). Completing a drill runs **full** session analysis (`mode=exercise`), not a toy score.

### What’s inside
- Streak / mission / recommended drills
- Categories (breathing, pause, articulation, …)
- `PracticeRecorderBar`: record until target duration (auto-stop at `duration_sec`)
- On finish: upload + `completeExercise` (+ complete mission if it matches) → session page

### User walkthrough
1. Open Labs → pick a recommended or listed drill.
2. Read instructions → Start → speak for the drill length.
3. Auto-finish or stop → wait for redirect to `/sessions/{id}`.
4. Read full report; note Labs banner + focus title/description.

---

## 8. Practice (`/practice`)

### What it is
Two tools on one page:

**A. Investor Q&A** — chat with an AI investor (DeepSeek if configured, else hardcoded fallback question).  
**B. Full pitch evaluation** — solo recorder → same pipeline as Record (`mode=practice`).

### What’s inside
- Scenarios: Seed / Series A / Demo day / Custom context
- Start → history of Q&A + score chips
- Answer by **voice** or **type**
- Voice answer: saves a practice session for full eval **and** (if browser transcript available) sends text to continue the investor chat
- Solo full-pitch recorder → navigate to session report
- Links to recent answer session IDs

### User walkthrough (Q&A)
1. Choose scenario / edit context → **Start**.
2. Read investor question → answer by voice or type.
3. Optional: open the saved answer session for full voice coaching.
4. Continue turns until done.

### User walkthrough (full pitch)
1. Use solo recorder → stop → land on `/sessions/{id}` with Practice banner.

---

## 9. Live Coach (inside Record only)

### What it is
**While recording**, real-time tips in the browser. Not Whisper. Not DeepSeek.

### What’s inside
- AnalyserNode energy / pitch proxies
- Optional Web SpeechRecognition for live transcript & WPM
- Flags / sentence tips / coach lines
- Ghost hints from Voice Memory keys (`rush_on_intro`, `filler_overuse`, `missing_pauses`)

### User walkthrough
1. On Record, leave Live Coach on → Start.
2. Watch panel while speaking.
3. After Stop & analyze, trust the **session report** for authoritative scores (Live Coach is guidance only).

---

## 10. Analysis engine (what “full evaluation” means)

Every successful upload runs roughly:

1. Normalize audio → mono 16 kHz WAV  
2. Local Whisper (or demo transcript if Whisper fails)  
3. Pace, fillers, pauses, acoustics, clarity  
4. Professional voice report (estimates)  
5. Language + pitch/investor JSON (DeepSeek **or** heuristics)  
6. Events merged → Voice Profile + Voice Memory + training plan  
7. Coach summary (DeepSeek **or** rule template)  
8. Status `ready`

Details & thresholds: [05-PIPELINE.md](./05-PIPELINE.md).

---

## 11. Feature vs optional DeepSeek

| User-visible piece | Needs DeepSeek? |
|--------------------|-----------------|
| Record / Labs / Practice / Listen upload + metrics + professional report + findings | **No** |
| Smart transcript + click-to-play | **No** |
| Dashboard / Memory / Labs catalog / missions | **No** |
| Rich coach essay | Better **with** key; fallback without |
| Investor chat quality | Better **with** key; basic fallback without |
| Pitch structure / language polish scores | Heuristic without; LLM JSON with |

See [08-LOCAL-VS-DEEPSEEK.md](./08-LOCAL-VS-DEEPSEEK.md).

---

## 12. End-to-end “first week” path (recommended)

1. **Setup** API + web ([02-SETUP.md](./02-SETUP.md)). DeepSeek optional.  
2. **Record** one short pitch → open session → click findings.  
3. Open **Coach** → set goal → note mission.  
4. Do that drill in **Labs** → compare second session.  
5. Check **Dashboard** after 3+ sessions for patterns.  
6. Optional: **Practice** investor Q&A; **Smart Session** for longer days.

---

## Not in the product (do not document as features)

- Cloud hosting of users’ audio  
- In-app DeepSeek key settings (key is server `.env` only)  
- Accent conversion / medical diagnosis  
- Video / eye-contact / pyannote diarization (roadmap only)  
- Session delete button in UI (API exists; UI does not call it)
