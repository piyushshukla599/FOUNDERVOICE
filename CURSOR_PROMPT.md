# FounderVoice AI — Improved Cursor Prompt

Use this instead of dumping the full feature list into a single chat.

---

## Master prompt (paste once per major session)

```
You are building FounderVoice AI — a local-first AI coach for founders, executives, and public speakers.

Positioning:
- Most tools say "You spoke too fast."
- We must answer "Why, what caused it, and exactly how do you fix it?"
- Unique moat: Voice Memory — learn speaking patterns across weeks/months and coach from the user's own history, not generic tips.

Read and follow AGENTS.md strictly.
Non-negotiables: fully offline (Whisper + optional local LLM only), SQLite + local files, causal coaching, timestamp-linked evidence, phased delivery.

Stack: Next.js, Tailwind, shadcn/ui, Framer Motion, Recharts, FastAPI, Whisper Large V3, local Llama 3.x/DeepSeek, librosa, Parselmouth, webrtcvad, ffmpeg, SQLite.

Implement ONLY the phase I specify next. Prefer a working vertical slice over scaffolding unused features. Every metric must persist and surface in UI (or wait until its phase).
```

Then add **one** phase line:

- `Phase 0 — skeleton + schema`
- `Phase 1 — record, Whisper, smart transcript, WPM/fillers/pauses`
- `Phase 2 — acoustic clarity, pace heatmaps, PDF v1`
- `Phase 3 — Voice Memory dashboard + personalized coach + exercises`
- `Phase 4 — pitch/investor scores + AI Practice Mode`
- `Phase 5 — advanced estimates / video (only if 1–4 are solid)`

---

## Why this beats the original prompt

| Original | Improved |
|----------|----------|
| Flat laundry list of 100+ features | Phased roadmap with MVP first |
| Voice Memory buried at the end | Voice Memory is the product moat |
| No coaching quality bar | Observation → cause → fix required |
| Agent tries to build everything | One phase per session |
| Unclear architecture | Explicit pipeline + data model |
| "Extract everything possible" | Honest estimates + evidence links |

---

## Product one-liner (for UI / README)

**FounderVoice AI** — Local-first AI coach for founders, executives, and public speakers. It doesn't just score your pitch; it remembers how you speak and tells you why it happened and how to fix it.
