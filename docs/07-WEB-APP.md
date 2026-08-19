# 07 — Web app

Root: `apps/web`  
Stack: Next.js 15 (Turbopack), React 19, Tailwind 4, Framer Motion, Recharts.

## Scripts

| npm script | Command |
|------------|---------|
| `dev` | `next dev --turbopack` |
| `build` | `next build --turbopack` |
| `start` | `next start` |
| `lint` | `eslint` |

## Navigation (`AppShell`)

| Label | Href |
|-------|------|
| Today | `/` |
| Listen | `/listen` |
| Labs | `/trainer` |
| Practice | `/practice` |
| Record | `/record` |
| Library | `/library` |
| Progress | `/dashboard` |
| Coach | `/coach` |

Also: `/welcome`, `/privacy`, `/terms` (no chrome). Contact modal from shell.

Footer: local audio · optional cloud coach.

## Pages

### `/` Today (`page.tsx`)

- 60s check recorder, Founder Voice score, streak
- Shortcuts to Listen / Labs / Practice
- `RecommendedLabs` from `api.exercises().recommended` (plain “sound” + speak line)
- Upload uses `mode=exercise` with daily prompt meta

### `/record` Long record

- Record: start, pause/resume, stop & analyze, restart, discard
- Push-to-talk; silence auto-stop **off by default**
- Live Coach toggle (`useLiveCoach`)
- Title + mode: `pitch` | `practice` | `exercise` | `free`
- Mic picker; drag/drop
- `api.health`, `api.memory`, `api.exercises`, `api.upload` → `/sessions/{id}`
- Recommended labs from Voice Memory

### `/listen` Smart Session

- Start/end; browser VAD; mic prefs / backup / hot-swap
- Summary + pending **Founder Voice Verdict** until a Labs drill
- `RecommendedLabs` from summary `lab_recs`
- Unlock: Labs upload or `api.unlockVerdict`

### `/listen/[id]`

- Polls ~4s; summary, verdict, lab recs, conversation links

### `/library`

- Filters: All / Record (`free`) / Labs (`exercise`) / Practice / Smart (`listening`) / Pitch
- Polls ~4s

### `/dashboard` (nav: Progress)

- Windows 7d / 30d / 60d from `api.dashboard`

### `/coach`

- Mission, goal, profile, plan, hard words, fillers, memory, fresh start

### `/trainer` (Labs)

- Tabs: For you / Lv1–3
- Each drill: **Speak this**, **How to speak it**, **What this means** (`speak` / `how` / `sense` from API)
- `?lab=` auto-opens a drill
- Upload `mode=exercise` → `completeExercise` → may unlock Listen verdict → session page
- After report: similar labs (`source: similar`)

### `/practice`

- Rounds: Standup / Hard question / Investor (levels 1–3)
- `practiceStart` / `practiceTurn`; voice or type
- Voice upload `mode=practice`; recommended labs refresh after last eval

### `/sessions/[id]`

- Poll while `pending` | `analyzing`
- `lab_recs` panel; Labs hide full professional dump
- Audio, transcript click-to-seek, coach, findings, PDF

**Defined but unused in UI:** `api.deleteSession`.

## Client API (`src/lib/api.ts`)

`API_BASE` = `NEXT_PUBLIC_API_BASE` or `http://127.0.0.1:8000`.

Methods mirror backend: health, sessions, session, deleteSession, dashboard, memory, voiceProgram, setVoiceGoal, completeMission, freshStart, exercises, completeExercise, upload, listening family, practiceStart, practiceTurn.

## Hooks

| Hook | Role |
|------|------|
| `useLiveCoach` | Live RMS/pitch proxies + SpeechRecognition tips; ghost hints from memory keys |
| `usePracticeRecorder` | MediaRecorder (+ optional speech) for Labs/Practice |
| `useSmartSession` | Listening orchestration + VAD + uploads |

## Components (selected)

| Component | Role |
|-----------|------|
| `ProfessionalVoiceReport` | Renders `payload.professional`; placeholder if missing |
| `RootCauseFinding` | Finding card; click seeks audio |
| `CoachSummary` | Renders coach text (lightweight markdown-ish) |
| `RecommendedLabs` | Plain-language voice problem + speak line + link to `/trainer?lab=` |
| `PracticeRecorderBar` | Shared record UI for Labs / Practice / Today |
| `LiveCoachPanel` | Live Coach chrome |
| `Waveform` / `LiveWaveform` | Mic visuals |

## Mic prefs (`micPrefs.ts`)

localStorage key `fv_mic_prefs_v1`: preferred/backup device IDs, `alwaysUsePreferred`, `speechStartSec` (3.5), `silenceEndSec` (4.5), `minConversationSec` (8), `minSpeechRatio` (0.22).  
`minSpeechRatio` is used by VAD but has **no settings UI input** currently.

## Smart VAD (`smartVad.ts`)

Phases: idle → arming → recording → saving → idle. RMS threshold, pre-roll, silence end, discard short/low-speech, encode mono WAV. No server VAD.
