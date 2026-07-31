# Deploy FounderVoice on the internet

FounderVoice was designed **local-first**. If you put the **API** on a public server, **recordings upload to that server** (your VPS), not each user’s laptop. That is fine for **your own remote access**; for a public multi-user launch, say clearly that the hosted demo stores audio on *your* server, or keep analysis local and only host the marketing site.

Below are two practical paths.

---

## Option A — Fastest (today): Cloudflare Tunnel from your PC

Use when you want a public HTTPS URL without renting a server. Your Windows machine must stay on.

### A1. Run API + Web locally

**Terminal 1 — API**

```powershell
cd C:\Users\HP\OneDrive\Documents\voicecoach\apps\api
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
```

(`0.0.0.0` allows tunnel access, not only localhost.)

**Terminal 2 — Web**

```powershell
cd C:\Users\HP\OneDrive\Documents\voicecoach\apps\web
```

Create/edit `.env.local`:

```
NEXT_PUBLIC_API_BASE=https://YOUR-API-TUNNEL-URL
NEXT_PUBLIC_SITE_URL=https://YOUR-WEB-TUNNEL-URL
```

(You’ll fill these after creating tunnels.)

```powershell
npm run dev -- --hostname 0.0.0.0 --port 3000
```

### A2. Install Cloudflare Tunnel (cloudflared)

1. Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Or: `winget install Cloudflare.cloudflared`

### A3. Create two quick tunnels (no domain required)

**API tunnel**

```powershell
cloudflared tunnel --url http://127.0.0.1:8000
```

Copy the `https://….trycloudflare.com` URL → this is `API_PUBLIC`.

**Web tunnel** (new terminal)

```powershell
cloudflared tunnel --url http://127.0.0.1:3000
```

Copy that URL → `WEB_PUBLIC`.

### A4. Wire CORS + frontend

In `apps/api/.env`:

```
CORS_ORIGINS=https://WEB_PUBLIC
API_DOCS_ENABLED=false
WHISPER_MODEL=base
```

Restart the API.

In `apps/web/.env.local`:

```
NEXT_PUBLIC_API_BASE=https://API_PUBLIC
NEXT_PUBLIC_SITE_URL=https://WEB_PUBLIC
```

Restart `npm run dev`.

### A5. Open from the internet

Visit `https://WEB_PUBLIC` (or `/welcome`).  
Mic + upload will call `https://API_PUBLIC`.

**Limits:** PC must stay awake; free tunnel URLs change each run unless you configure a named tunnel + your domain.

---

## Option B — Free-tier friendly: Vercel (Web) + Railway (API)

Yes — this is a valid free (or nearly free) combo. Use it when you want a public URL without managing a VPS.

### Why it works
| Piece | Host | Role |
|-------|------|------|
| Next.js UI | **Vercel** (Hobby free) | Pages, mic UI, uploads from browser |
| FastAPI + Whisper + SQLite | **Railway** (trial / free credits) | `/api/*`, analysis, `data/` |

Browser → Vercel page → `NEXT_PUBLIC_API_BASE` → Railway API.

### Why it’s harder than a simple Node API
1. **Whisper is heavy** — first analyze downloads a model; free Railway memory (~512MB–8GB depending on plan) may OOM on `large-v3`. Start with **`WHISPER_MODEL=base`**.
2. **SQLite + files need a volume** — Railway’s filesystem can be ephemeral unless you attach a **volume** at `/data`.
3. **Cold starts** — free/sleeping services wake slowly; first request after idle can take 30–60s+.
4. **Build time / image size** — `faster-whisper` + torch stack makes Docker builds large; may hit free build limits.
5. **Credits expire** — Railway’s free trial credits are not always “forever free”; check current pricing.

If Whisper won’t fit, keep **marketing on Vercel** and run API on your PC via Tunnel (Option A), or a cheap VPS (Option C).

### B1. Deploy API on Railway

1. Push this repo to GitHub (no `.env`, no `data/` audio).
2. [railway.app](https://railway.app) → New Project → **Deploy from GitHub**.
3. Set **Root Directory** to `apps/api` (or use the repo `Dockerfile` at `apps/api/Dockerfile`).
4. Add a **Volume** mounted at `/data`.
5. Variables:

```
DATA_DIR=/data
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
API_DOCS_ENABLED=false
CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app
DEEPSEEK_API_KEY=          # optional
CONTACT_TO_EMAIL=you@mail.com
```

6. Generate a public HTTPS domain in Railway (e.g. `https://foundervoice-api.up.railway.app`).
7. Health check path: `/api/health`.
8. Confirm: open `https://YOUR-RAILWAY-URL/api/health` in a browser.

**Start command** (if not using Dockerfile):

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 75
```

(Railway sets `PORT`. Your Dockerfile currently hardcodes `8000` — either map that port in Railway or change CMD to use `$PORT`.)

### B2. Fix Dockerfile PORT for Railway (recommended)

Railway injects `PORT`. Prefer:

```
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-keep-alive 75
```

### B3. Deploy Web on Vercel

1. Vercel → New Project → same GitHub repo.
2. **Root Directory:** `apps/web`
3. Env:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_BASE` | `https://YOUR-RAILWAY-URL` (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-VERCEL-APP.vercel.app` |

4. Deploy → open the Vercel URL → Record a **short** clip.

5. Update Railway `CORS_ORIGINS` to the **exact** Vercel URL (and custom domain if any), then redeploy API.

### B4. If Railway OOMs or build fails
- Keep `WHISPER_MODEL=base`
- Upgrade Railway memory, **or**
- Use Option A (tunnel) / Option C (VPS) for the API only; leave UI on Vercel

---

## Option C — Proper: VPS (API) + Vercel (Web)

Use when you want a stable URL (phone, friends, demo).

### C1. Get a VPS

Any Ubuntu 22.04+ box (Hetzner, DigitalOcean, Lightsail, etc.):

- **2 vCPU / 4 GB RAM** minimum (Whisper `base`)
- **8 GB+** recommended if you use `small` / `large-v3`
- Open ports **22** (SSH) and **80/443** (HTTPS)

### C2. Point a domain (optional but recommended)

Examples:

- `api.yourdomain.com` → VPS IP  
- `app.yourdomain.com` → Vercel (later)

### C3. Install Docker on the VPS

```bash
ssh root@YOUR_VPS_IP
apt update && apt install -y docker.io docker-compose-v2 git
```

### C4. Copy the project to the VPS

From your PC (PowerShell):

```powershell
cd C:\Users\HP\OneDrive\Documents\voicecoach
# Prefer git push + clone on server, or:
scp -r apps\api docker-compose.yml root@YOUR_VPS_IP:/opt/foundervoice/
```

On the VPS, create `/opt/foundervoice/apps/api/.env` (**never commit this**):

```
DEEPSEEK_API_KEY=          # optional
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
DATA_DIR=/data
CORS_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
API_DOCS_ENABLED=false
CONTACT_TO_EMAIL=you@yourmail.com
# SMTP_* if you want feedback emails
```

Update `docker-compose.yml` on the server so `CORS_ORIGINS` matches (or rely on `.env` — compose currently overrides CORS; edit that line to your real web origin):

```yaml
environment:
  DATA_DIR: /data
  CORS_ORIGINS: https://app.yourdomain.com
  API_DOCS_ENABLED: "false"
```

### C5. Start the API

```bash
cd /opt/foundervoice
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8000/api/health
```

### C6. HTTPS in front of the API (Caddy example)

```bash
apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
api.yourdomain.com {
  reverse_proxy 127.0.0.1:8000
}
```

```bash
systemctl reload caddy
curl https://api.yourdomain.com/api/health
```

### C7. Deploy the Web on Vercel

1. Push this repo to GitHub (without `.env` / `data/`).
2. https://vercel.com → **New Project** → import the repo.
3. **Root Directory:** `apps/web`
4. Environment variables:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_BASE` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://app.yourdomain.com` |

5. Deploy. Attach domain `app.yourdomain.com`.

6. Confirm API `.env` / compose `CORS_ORIGINS` includes that exact Vercel URL (including `https://`).

### C8. Smoke test from your phone

1. Open `https://app.yourdomain.com/welcome`
2. Open Record → allow mic → short clip → session report
3. Feedback form → check `CONTACT_TO_EMAIL` / `data/leads` on server

---

## Option D — Marketing only on Vercel (analysis stays at home)

Host `/welcome` publicly; tell users to clone and run locally for real coaching.

- Vercel: `apps/web` only  
- `NEXT_PUBLIC_API_BASE` unused for marketing, or point demos to a **separate** demo API you accept will receive audio  

This keeps the Product Hunt story honest: **local-first**.

---

## Checklist before you share the link

| Item | Why |
|------|-----|
| HTTPS only | Mic/secure context in browsers |
| `CORS_ORIGINS` exact match | Browser blocks wrong origins |
| `API_DOCS_ENABLED=false` | Hide Swagger on public API |
| Strong VPS firewall | Only 22/80/443 |
| Disk space for Whisper + audio | Models + uploads grow |
| Privacy copy | Hosted API = audio on your server |

---

## Cost ballpark

| Setup | Typical |
|-------|---------|
| Cloudflare Tunnel + your PC | Free |
| Small VPS + Whisper `base` | ~$5–12/mo |
| Vercel hobby web | Free tier often enough |
| DeepSeek API (optional) | Pay-as-you-go text tokens |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Failed to fetch` | Wrong `NEXT_PUBLIC_API_BASE` or CORS missing your web origin |
| Mic blocked | Page must be HTTPS (or localhost) |
| Analysis forever / OOM | Use `WHISPER_MODEL=base`; add RAM |
| Tunnel works then dies | PC sleep / tunnel process closed |
| CORS still failing | No trailing slash mismatch; include both `www` and apex if used |
