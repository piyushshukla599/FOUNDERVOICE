# 02 — Setup & run

## Prerequisites

- Windows is the documented path (repo includes `start-api.bat`).
- Python 3.x with venv under `apps/api/.venv`
- Node.js + npm for `apps/web`
- Optional: **ffmpeg** on PATH (improves non-WAV decode; `audio.py` also tries soundfile / PyAV / librosa)

## 1. API

```powershell
cd apps\api
py -3 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `apps/api/.env` (see fields below). Then either:

```powershell
# From apps\api
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

Or double-click repo root **`start-api.bat`** (uses venv uvicorn, port **8000**, keep-alive 75s, then `pause`).

Root npm script (from repo root):

```powershell
npm run dev:api
```

(`package.json` runs `cd apps/api && .venv/Scripts/uvicorn … --reload --port 8000`)

### Health check

`GET http://127.0.0.1:8000/api/health`

Example shape:

```json
{
  "ok": true,
  "product": "FounderVoice AI",
  "deepseek_configured": true,
  "whisper_model": "base"
}
```

`deepseek_configured` is true when `DEEPSEEK_API_KEY` is non-empty and does **not** start with `sk-your`.

## 2. Web

```powershell
cd apps\web
npm install
npm run dev
```

Open the URL Next prints (usually `http://localhost:3000`; **3001 or 3002** if 3000 is busy). Use the printed Local URL. CORS allows localhost on those ports after API restart.

Root: `npm run dev:web`.

### Web env

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

If unset, client defaults to `http://127.0.0.1:8000` (`src/lib/api.ts`).

`next.config.ts` also rewrites `/api/:path*` → `http://127.0.0.1:8000/api/:path*`, but the TS client calls `NEXT_PUBLIC_API_BASE` directly.

## Environment variables (`apps/api`)

From `config.py` + `.env.example`:

| Env | Default in code | Notes |
|-----|-----------------|-------|
| `DEEPSEEK_API_KEY` | `""` | Optional. Placeholder `sk-your…` treated as unset |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | |
| `DEEPSEEK_MODEL` | `deepseek-chat` | |
| `WHISPER_MODEL` | `large-v3` | Use `base` / `small` for faster CPU |
| `WHISPER_DEVICE` | `cpu` | |
| `WHISPER_COMPUTE_TYPE` | `int8` | |
| `DATA_DIR` | repo `data/` absolute default | `.env.example` uses `../../data` when cwd is `apps/api` |
| `CORS_ORIGINS` | localhost 3000–3002 + LAN examples | Comma-separated; `main.py` also allows localhost/127.0.0.1 any port via regex |
| `MAX_UPLOAD_BYTES` | `104857600` (100 MB) | Not in `.env.example`; overridable via env |

## First-run data

On API import, `init_db()`:

1. Creates `data/`, `audio/`, `transcripts/`, `reports/`, `models/`
2. Creates SQLite tables
3. Runs light migrations (extra `sessions` columns)
4. Seeds **25** exercises (`INSERT OR IGNORE`) plus levels

## Common failures (observed in ops)

| Symptom | Likely cause |
|---------|----------------|
| Web “Failed to fetch” / blank data | API down, **or CORS** (web on 3002 while API only allowed 3000) — restart API |
| Port 8000 in use (Windows 10048) | Old uvicorn still bound — keep it, or `taskkill` that PID then restart |
| Analysis error NameError | Bug in analysis code; check API traceback |
| Transcript warning / demo text | Whisper failed → `demo-fallback` transcript |
| DeepSeek “Key needed” on Record | Health shows `deepseek_configured: false` — app still analyzes; coach uses rule fallback |

## Do not commit

- `apps/api/.env` (may contain real DeepSeek key)
- Large `data/models/` Whisper weights
- User audio under `data/audio/`
