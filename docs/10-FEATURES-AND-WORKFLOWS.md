# 10 — Features & user walkthroughs

Accurate inventory of **what the product does today** (doc pass **2026-08-19**), what is **inside** each feature, and **how a user uses it**.  
Source: `apps/web` pages + `apps/api` pipeline/routers. No planned Phase 5 items.

---

## Quick map

| User goal | Go to | Ends up as |
|-----------|-------|------------|
| 60s check + score + lab hints | **Today** `/` | Optional `mode=exercise` session |
| Real talks (earbuds / meetings) | **Listen** `/listen` | Listening session + child clips; **verdict after a Labs drill** |
| Train one skill with a line to speak | **Labs** `/trainer` | `mode=exercise` → report for **that lab only** |
| Investor Q&A under pressure | **Practice** `/practice` | Chat + optional `mode=practice` sessions |
| Long pitch with live coach | **Record** `/record` | Session `pitch` / `free` / … → `/sessions/{id}` |
| Find past work | **Library** `/library` | Session pages |
| Trends over weeks | **Progress** `/dashboard` | 7d / 30d / 60d |
| Goals, mission, profile, wipe | **Coach** `/coach` | Memory + training program |

**Shared engine:** uploaded clips run the **same** analysis pipeline (Whisper → metrics → professional report → coach). Labs add a **script + specialty focus** so coaching does not grade a warmup like a full pitch.

DeepSeek key: **optional**. Without it, scores/report/findings still work; coach text uses rule templates.

---

## 0. Today (`/`)

### What it is
Home. One job: a **60-second check**, your Founder Voice score, and **what your voice is doing** → which lab to open.

### What’s inside
- Rolling 7d score vs 30d (estimate)
- Streak
- Daily 60s prompt + recorder
- Listen / Labs levels / Practice shortcuts
- **Recommended labs** in plain words (“your voice sounds rushed…”) with a line to speak

### User walkthrough
1. Open the app (usually `http://localhost:3000`; Next may use **3001/3002** if 3000 is busy).
2. Read the habit line. Speak the 60s prompt **or** tap a recommended lab.
3. After a recording, the session report names the problem and the next lab.

---

## 1. Record (`/record`)

### What it is
Long capture: mic or file → upload → full evaluation. For daily 60s use **Today**; for all-day talk use **Listen**.

### What’s inside
- Mic list / device pick
- Start · Pause/Resume · Stop & analyze · Restart · Discard
- **Push-to-talk**
- **Silence auto-stop** — **off by default**
- **Live Coach** (on by default): browser-side hints — **not** the full server pipeline
- Title + mode: `pitch` | `practice` | `exercise` | `free`
- Drag-drop / file upload, max **100 MB**
- Health strip: Whisper model
- **From your voice so far** — recommended labs (plain language + speak line)

### User walkthrough
1. Start API + web; open **Record**.
2. Pick mic. Set title/mode if you want.
3. **Start** → speak → **Stop & analyze** (or drop a file).
4. Browser opens **`/sessions/{id}`**. Wait until **ready**.
5. Read “what this recording showed” and open the matching lab.

### How it works (system)
Browser MediaRecorder → `POST /api/sessions/upload` → background `run_pipeline`.

---

## 2. Session report (`/sessions/{id}`)

### What it is
Result screen for Record, Labs, Practice, Today checks, and Listen clips. Coaching is evidence-linked (click timestamp → play).

### What’s inside (when `ready`)
| Block | Content |
|-------|---------|
| Status / mode | `pending` / `analyzing` / `ready` / error; Labs/Practice focus banner |
| **Lab recs** | Plain “your voice sounds like…” + **Speak this** + Open lab. After a Labs drill: **more labs like this** |
| Top stats | WPM, fillers, clarity, confidence (est.), pause quality, presence, trust, monotone. Labs: fewer stats (specialty) |
| Audio | `/api/sessions/{id}/audio` |
| Professional voice report | Dims, pitch, resonance, EP, emotion timeline (seekable), … — **hidden for Labs** (specialty review only) |
| Smart transcript | Click sentence → seek |
| Coach summary | Lab-only review when `mode=exercise` |
| Root-cause findings | Observation → cause → fix |
| PDF | `/api/sessions/{id}/report` |

### User walkthrough
1. Land from upload or Library.
2. If evaluating — wait (polls ~2.5s).
3. Read the **voice problem in easy words**, then the lab to practice.
4. Click transcript/findings to hear the moment.
5. After a lab, pick a **similar** lab (same skill family).

---

## 3. Listen / Smart Session (`/listen`, `/listen/[id]`)

### What it is
Long-running listen: Start once. Browser splits real conversation into clips. **Light collection** during the day. **Full Founder Voice Verdict only after you complete a Labs exercise/test** (same mic / earbuds recommended).

### What’s inside
- Start / End
- Settings: preferred/backup mic, VAD timing
- Mic hot-swap / “new mic detected”
- Past sessions list
- Summary: duration, conversations, WPM, weakness, ROI tip, **lab recs**
- Verdict: **pending** until a Labs drill; then score + compare real talk vs drill
- Detail: conversations → `/sessions/{id}`

### User walkthrough
1. Put **earbuds or headset** on if you can (cleaner capture).
2. **Listen → Start**. Talk normally (calls, meetings).
3. Clips upload in the background. This is **not** the final grade.
4. **End** session.
5. Open **Labs**, speak the recommended line the way the card says.
6. Return to Listen → verdict unlocks (or “Already drilled? Refresh verdict”).

### How it works (system)
- VAD in the browser (`smartVad.ts`).
- Child sessions `mode=listening`.
- `POST /api/listening/{id}/verdict` with optional `exercise_session_id`.
- Config: `listening_light_analysis` (collect metrics; verdict after exercise).

---

## 4. Library (`/library`)

Browse analysis sessions. Filters: All / Record / Labs / Practice / Smart / Pitch. Click row → session report.

---

## 5. Progress (`/dashboard`)

7d / 30d / 60d Voice Memory charts and recurring patterns. Act on them in Labs.

---

## 6. Coach (`/coach`)

Mission, goal picker, voice profile, development plan, hard words, custom fillers, **Fresh start** (type `DELETE`).

---

## 7. Labs (`/trainer`)

### What it is
One skill at a time. You are **not** pitching. The product gives:

1. **Speak this** — the exact sentence  
2. **How to speak it** — pause, breath, speed, endings  
3. **What this means** — why that line exists  

Then you record. Review is **only that specialty**. Afterward: **more labs like that**.

### What’s inside
- Tabs: **For you** (Voice Memory) · Lv1 Warm · Lv2 Control · Lv3 Pressure  
- All levels choosable (map, not a lock)
- Streak / XP / suggested today
- Cards show the speak line + sense
- `?lab=pause_drill_3` opens that drill (from recommendations)
- Recorder auto-stops at `duration_sec`
- Finish: upload `mode=exercise` + `completeExercise` (+ mission / unlock Listen verdict)

Seeded catalog: **25** drills (breath, pause, fillers, pitch, ask, …).

### User walkthrough
1. Open **Labs** (or click **Open [lab]** from Today / Record / a report).
2. Read Speak / How / Sense.
3. **Speak the line** the way How says.
4. Land on the session report (lab-only coach).
5. Open a **similar** lab and repeat.

### How Labs coaching works
`lab_coach.py`: allowed finding types per drill (e.g. pitch variation is **not** a fail during the pitch lab). Other weaknesses wait for their own lab.

---

## 8. Practice (`/practice`)

### What it is
Three rounds: **Standup (Lv1) → Hard question (Lv2) → Investor (Lv3)**. Speak like a founder. Each voice answer still gets a full local report.

### What’s inside
- Round picker
- Begin → investor/operator chat (DeepSeek or fallback)
- Answer by **voice** or **type**
- Voice: upload `mode=practice` + continue chat if live transcript exists
- **From your voice so far** / after an answer: recommended labs with speak lines

### User walkthrough
1. Pick a round → **Begin**.
2. Answer with voice (same mic as Listen if you can).
3. Open the voice report → do the named lab.

---

## 9. Live Coach (Record only)

While recording, browser-side WPM/clarity/breath hints. Not Whisper. Not DeepSeek. Trust the **session report** after stop.

---

## 10. Analysis engine

1. Normalize audio → mono 16 kHz WAV  
2. Local Whisper (or demo transcript if Whisper fails)  
3. Pace, fillers, pauses, acoustics, clarity  
4. Professional voice report (estimates)  
5. Language + pitch JSON (DeepSeek **or** heuristics)  
6. Events → Voice Profile + Voice Memory + training plan  
7. Coach summary (DeepSeek **or** lab/rule template)  
8. Status `ready`

Details: [05-PIPELINE.md](./05-PIPELINE.md).

---

## 11. Feature vs optional DeepSeek

| User-visible piece | Needs DeepSeek? |
|--------------------|-----------------|
| Record / Labs / Practice / Listen + metrics + findings | **No** |
| Speak/how/sense lab cards + recommendations | **No** |
| Dashboard / Memory / missions | **No** |
| Rich coach essay | Better **with** key |
| Investor chat quality | Better **with** key |

See [08-LOCAL-VS-DEEPSEEK.md](./08-LOCAL-VS-DEEPSEEK.md).

---

## 12. End-to-end “first week” path

1. **Setup** API + web ([02-SETUP.md](./02-SETUP.md)). DeepSeek optional.  
2. **Today** — 60s check → read what your voice is doing.  
3. **Labs** — speak the given line the way the card says.  
4. **Record** a short pitch → click findings.  
5. Optional: **Listen** a real call (earbuds) → Labs drill → verdict.  
6. **Practice** hard questions. **Progress** after 3+ sessions.

---

## Run notes (ops)

- API: `127.0.0.1:8000`. If bind fails (Windows 10048), another uvicorn is already running — do not start a second one.
- Web: `localhost:3000` (or 3001/3002). Browser talks to the API directly; CORS allows localhost on those ports (`allow_origin_regex` + `CORS_ORIGINS`).
- “Nothing fetches” on 3002: old CORS only listed 3000 — restart API after CORS change.

---

## Not in the product (do not document as features)

- Cloud hosting of users’ audio  
- In-app DeepSeek key settings (server `.env` only)  
- Accent conversion / medical diagnosis  
- Video / eye-contact / pyannote diarization (roadmap only)  
- Native mobile app (web first; WebView later is a packaging choice, not a current feature)
