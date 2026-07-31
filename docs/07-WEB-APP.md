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
| Record | `/` |
| Smart Session | `/listen` |
| Library | `/library` |
| Dashboard | `/dashboard` |
| Coach | `/coach` |
| Labs | `/trainer` |
| Practice | `/practice` |

Footer copy in shell: “Audio local · Coach via DeepSeek”.

## Pages

### `/` Record (`page.tsx`)

- Record: start, pause/resume, stop & analyze, restart, discard
- Push-to-talk
- Optional silence auto-stop (~6s silence; not in first ~8s) — **off by default** in current code path (verify `page.tsx` if changing)
- Live Coach toggle (`useLiveCoach`)
- Title + mode: `pitch` | `practice` | `exercise` | `free`
- Mic picker; drag/drop or file picker
- Calls `api.health`, `api.memory`, `api.upload` → navigates to `/sessions/{id}`
- Shows DeepSeek ready vs “Key needed” from health (analysis still works without key)

### `/listen` Smart Session

- Explicit start/end session
- Browser VAD segments conversations → upload as listening children
- Mic prefs / backup / hot-swap (`micPrefs.ts`, `useSmartSession`)
- Lists past listening sessions

### `/listen/[id]`

- Polls listening detail (~4s)
- Summary + links to conversation session pages

### `/library`

- Filters: All / Record (`free`) / Labs (`exercise`) / Practice / Smart (`listening`) / Pitch
- Polls sessions (~4s); shows raw `status`

### `/dashboard`

- Windows 7d / 30d / 60d from `api.dashboard`
- Charts + patterns

### `/coach`

- Daily mission, goal picker, voice profile, plan, hard words, memory, fresh start
- APIs: `memory`, `voiceProgram`, `setVoiceGoal`, `completeMission`, `freshStart`

### `/trainer` (Labs)

- Drills from `api.exercises`
- Record with `PracticeRecorderBar` → upload `mode=exercise` + meta → `completeExercise` → session page

### `/practice`

- Full solo eval recorder (`mode=practice`)
- Investor Q&A via `practiceStart` / `practiceTurn` (voice or typed)

### `/sessions/[id]`

- Poll while `pending` | `analyzing`
- Audio player, metrics, `ProfessionalVoiceReport`, smart transcript click-to-seek, `CoachSummary`, root-cause findings, PDF link
- Shows `session.error` if analysis failed
- Shows `transcript.warning` if present (e.g. demo Whisper)

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
| `PracticeRecorderBar` | Shared record UI for Labs/Practice |
| `LiveCoachPanel` | Live Coach chrome |
| `Waveform` / `LiveWaveform` | Mic visuals |

## Mic prefs (`micPrefs.ts`)

localStorage key `fv_mic_prefs_v1`: preferred/backup device IDs, `alwaysUsePreferred`, `speechStartSec` (3.5), `silenceEndSec` (4.5), `minConversationSec` (8), `minSpeechRatio` (0.22).  
`minSpeechRatio` is used by VAD but has **no settings UI input** currently.

## Smart VAD (`smartVad.ts`)

Phases: idle → arming → recording → saving → idle. RMS threshold, pre-roll, silence end, discard short/low-speech, encode mono WAV. No server VAD.
