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

Open http://localhost:3000 — or http://localhost:3000/welcome for the public landing.

### Docker (API only)

```powershell
docker compose up -d --build
```

Data persists in the `fv_data` volume. Point the web app at `http://127.0.0.1:8000`.

---

## What you get

| Area | Included |
|------|----------|
| Record | Mic + upload, Live Coach, full evaluation |
| Smart Session | Auto-split conversations (browser VAD) |
| Session report | Transcript click-to-play, professional voice, findings, PDF |
| Dashboard | 7d / 30d / 60d Voice Memory trends |
| Coach | Goals, mission, profile, custom fillers, fresh start |
| Labs | Timed drills → same analysis engine as Record |
| Practice | Investor Q&A + full pitch eval |

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
