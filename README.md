# FounderVoice AI

**Local-first AI executive speech coach — 100% free.**

Most tools say *“You spoke too fast.”*  
FounderVoice answers *why it happened, what caused it, and exactly how to fix it* — with **Voice Memory** across weeks, not one-off scores.

Audio and Whisper stay on your machine. No cloud audio storage. No account required for local use.

[Welcome](./apps/web/src/app/welcome/page.tsx) · [Docs](./docs/README.md) · [FAQ](./docs/FAQ.md) · [Privacy](./apps/web/src/app/privacy/page.tsx) · [Launch checklist](./docs/LAUNCH.md) · [Changelog](./CHANGELOG.md)

---

## Quick start (Windows)

### 1. API

```powershell
cd apps\api
py -3 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Or double-click `start-api.bat` at the repo root.

Optional: set `DEEPSEEK_API_KEY` in `.env` for richer coach prose. **Not required** — built-in elite templates work offline.

### 2. Web

```powershell
cd apps\web
npm install
# optional: echo NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 > .env.local
npm run dev
```

Open the URL Next prints (`http://localhost:3000`, or **3001/3002** if 3000 is busy). Landing: `/welcome`.

#### Where contact, Pro and feedback forms go

Every form (the `/contact` page, the in-app feedback modal, and the Pro
request) posts to [FormSubmit](https://formsubmit.co) from the browser, so the
message lands in an inbox whether or not the API has SMTP configured. The same
lead is also POSTed to `/api/contact`, which stores it in `contact_leads`.

**FormSubmit needs activating once.** Submit any form, then click the
activation link FormSubmit emails to the destination address — until that is
done, submissions are held rather than delivered.

The destination lives in `NEXT_PUBLIC_FORMSUBMIT_ENDPOINT` (see
`apps/web/src/lib/formsubmit.ts` for the default). It ships in the client
bundle, so after activating, swap in the random alias FormSubmit issues to keep
the real address out of scrapers' reach:

```powershell
echo NEXT_PUBLIC_FORMSUBMIT_ENDPOINT=abc123yourhash >> .env.local
```


#### The coach's voice, and what it costs

The coach speaks its review as well as writing it — on `/pitch` it briefs you,
counts you in and reads the verdict back, and every session report carries a
**Hear it from the coach** player.

**The default costs nothing.** With no configuration the browser speaks the
lines itself via the Web Speech API: no key, no account, no per-character bill,
and it works offline. Edge, macOS and iOS ship neural voices that genuinely
pass for a person; where a browser offers several, the picker beside the player
lets you choose, and the choice is remembered.

Hosted voices (ElevenLabs, OpenAI, Groq PlayAI) are an opt-in upgrade, off by
default so that a `GROQ_API_KEY` set for transcription can never quietly start
billing for speech. Turn one on in `apps/api/.env`:

```env
TTS_PROVIDER=auto
ELEVENLABS_API_KEY=...
```

Either way the audio is never uploaded — only the finished coaching text is
sent, the same line `AGENTS.md` draws for DeepSeek. Synthesised lines are cached
under `data/<workspace>/tts`, so replaying a review does not pay twice.

### Docker (API only)

```powershell
docker compose up -d --build
```

Data persists in the `fv_data` volume. Point the web app at `http://127.0.0.1:8000`.

---

## What you get

| Area | Included |
|------|----------|
| Today | 60s check, score, recommended labs in plain words |
| 45s Pitch | Spoken brief, 45-second clock, spoken verdict — hands free |
| Listen | Real talk (earbuds/mic); verdict after a Labs drill |
| Labs | Speak this / how / what it means; similar labs next |
| Practice | Standup → hard Q → investor; voice report + lab recs |
| Record | Long pitch, Live Coach, full evaluation |
| Session report | Transcript click-to-play, findings, lab recs, PDF |
| Progress | 7d / 30d / 60d Voice Memory |
| Coach | Goals, mission, profile, fillers, fresh start |

Deep walkthroughs: [`docs/10-FEATURES-AND-WORKFLOWS.md`](./docs/10-FEATURES-AND-WORKFLOWS.md)

---

## Privacy (non-negotiable)

- Recordings → local `data/audio`
- SQLite → local `data/foundervoice.db`
- Whisper weights → local `data/models`
- Optional coaching API receives **text/metrics only** if you configure a key on your server

See in-app [/privacy](http://localhost:3000/privacy) and [docs/08-LOCAL-VS-DEEPSEEK.md](./docs/08-LOCAL-VS-DEEPSEEK.md).

---

## Stack

Next.js · FastAPI · SQLite · faster-whisper · librosa · optional DeepSeek Chat for prose

---

## License

[MIT](./LICENSE) — free to use, modify, and share.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
