# 11 — Going to production (free stack)

The launch path for FounderVoice: **web on Vercel, API on an Oracle Cloud Always
Free box.** Both cost nothing, and together they run the real Whisper pipeline
rather than a stubbed one.

Written against the code as of **2026-08-19**. Every setting named here exists in
`apps/api/app/config.py`.

---

## 0. Why this split

The web app is static-ish Next.js — free anywhere, forever. The API is not, and
the reason is worth stating plainly before you pick a host:

| It needs | Because | Rules out |
|----------|---------|-----------|
| ~1 GB RAM (`base`), ~3 GB (`large-v3`) | `whisper_asr.py` keeps the model resident via `@lru_cache` | Render free (512 MB) |
| A persistent disk | SQLite at `data/foundervoice.db`, plus `audio/`, `transcripts/`, `reports/` | Any ephemeral filesystem |
| Multi-minute requests | Transcription is synchronous | Vercel / Netlify functions (10–60 s cap) |
| ~1–2 GB image | `faster-whisper` + `librosa` + `ctranslate2` | Vercel's 250 MB bundle limit |

Oracle's Always Free ARM tier (4 cores / 24 GB) clears all four. A €4/mo Hetzner
CX22 is the fallback if Oracle capacity is unavailable in your region.

---

## 1. Before you deploy — the five-minute checklist

- [ ] `QUOTA_SECRET` set to a real random value (see §3). **Without it the free-tier counters reset on every restart.**
- [ ] `TRUSTED_PROXY_HEADER` set to match your proxy — or deliberately left empty (see §3).
- [ ] `DEEPSEEK_API_KEY` valid, or accept rule-template coaching (see §5).
- [ ] `WHISPER_MODEL=base` — `large-v3` needs ~3 GB and is much slower on shared CPU.
- [ ] `CORS_ORIGINS` includes your real web origin, not just localhost.
- [ ] `API_DOCS_ENABLED=false` if you do not want Swagger public.
- [ ] `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_SITE_URL` set in Vercel.
- [ ] Privacy page states that hosted recordings land on your server.

---

## 2. The API on Oracle Always Free

### 2.1 Create the instance

Oracle Cloud → Compute → Create Instance:

- **Shape:** `VM.Standard.A1.Flex` (Ampere ARM), 2 OCPU / 12 GB is plenty
- **Image:** Ubuntu 22.04
- **Boot volume:** 50 GB+ — audio accumulates
- Save the SSH key it offers; you cannot retrieve it later

Open port 8000 in **both** places — Oracle has two firewalls and forgetting the
second is the usual "it hangs forever":

```bash
# 1. VCN security list: add ingress 0.0.0.0/0 TCP 8000 (in the web console)
# 2. The instance's own iptables:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save
```

### 2.2 Install and run

```bash
sudo apt update && sudo apt install -y python3.12-venv ffmpeg git
git clone <your-repo> voicecoach && cd voicecoach/apps/api
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env && nano .env          # fill in §1's checklist
./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
```

`ffmpeg` is not in `requirements.txt` but `librosa` needs it to decode `.webm`
uploads from the browser. Installing it is not optional.

### 2.3 Keep it running

```ini
# /etc/systemd/system/foundervoice.service
[Unit]
Description=FounderVoice API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/voicecoach/apps/api
ExecStart=/home/ubuntu/voicecoach/apps/api/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 75
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now foundervoice
sudo journalctl -u foundervoice -f
```

### 2.4 HTTPS

Browsers refuse `getUserMedia` (the microphone) on plain HTTP from a remote
origin. **The API and the web app both need TLS or recording will not work.**
Put Cloudflare in front of the box, or terminate with Caddy:

```
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8000
}
```

---

## 3. The free-tier quota

Implemented in `apps/api/app/services/quota.py`. Two limits matter:

| Feature | Default | Setting |
|---------|---------|---------|
| Recordings analysed | 5 | `FREE_UPLOAD_LIMIT` |
| Investor practice rounds | 2 | `FREE_PRACTICE_LIMIT` |
| Practice replies (ceiling) | 20 | `FREE_PRACTICE_TURN_LIMIT` |

Exhausted callers get **HTTP 402** with a structured body; the web app renders
`UpgradeGate` and points at `/contact?interest=pro`.

### What makes the limit hold

- Counting is **atomic** (`BEGIN IMMEDIATE`), so concurrent requests cannot all pass the same check.
- IPv6 collapses to its **/64** — a residential customer owns the whole block and could otherwise rotate addresses freely.
- Buckets are **HMAC-SHA256 digests**; no raw visitor IP is ever written to the database.
- Loopback and LAN callers are exempt (`QUOTA_EXEMPT_PRIVATE=true`), so your own testing is never counted.

### `TRUSTED_PROXY_HEADER` — get this right

Any client can send `X-Forwarded-For: 1.2.3.4` and mint a fresh identity per
request. The API therefore ignores proxy headers **unless you name one**.

| Your setup | Set it to | Why |
|------------|-----------|-----|
| Behind Cloudflare | `cf-connecting-ip` | The edge overwrites it; a visitor cannot forge it |
| Behind Caddy/nginx | `x-forwarded-for` | Only safe if the proxy is the *only* route to port 8000 |
| API exposed directly | *(empty)* | The socket address is the only trustworthy source |

**If you set `x-forwarded-for` while port 8000 is also reachable directly, the
limit is bypassable in one curl.** Close the port to everything but the proxy.

Verify after deploy:

```bash
curl https://api.yourdomain.com/api/quota
# {"enabled":true,"features":{"upload":{"remaining":5,...}},...}
```

---

## 4. The web app on Vercel

Import the repo, set **Root Directory** to `apps/web`, then add:

```
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

`NEXT_PUBLIC_SITE_URL` is not cosmetic — `robots.ts` and `sitemap.ts` both build
absolute URLs from it, and a wrong value publishes a sitemap pointing at
localhost.

Then add that same origin to the API's `CORS_ORIGINS` and restart it.

---

## 5. DeepSeek is optional — and now fails softly

`deepseek_chat` returns `""` on any provider failure (rejected key, rate limit,
network, malformed body) and every caller falls back to a rule template. A dead
key degrades coach *wording*; it no longer takes a feature down.

A rejected key logs one line per failure kind:

```
DeepSeek rejected the API key (401) — using rule templates.
```

If you see that, the key or its billing is the problem, not the deploy.

---

## 6. SEO checklist

Already wired:

- `robots.ts` generates an **absolute** `Sitemap:` URL (a relative one is invalid and ignored)
- Per-user surfaces (`/coach`, `/trainer`, `/sessions/…`) are disallowed and kept out of the sitemap — listing a page you disallow sends crawlers a contradiction
- `SoftwareApplication` JSON-LD in `layout.tsx`, `ContactPage` JSON-LD on `/contact`
- Canonical URL, `max-image-preview:large`, OpenGraph and Twitter cards

Still worth doing by hand:

- [ ] A real OG image at `/opengraph-image.png` (1200×630) — social cards are currently text-only
- [ ] Submit the sitemap in Google Search Console
- [ ] Verify `themeColor` matches `--bg` after any palette change

---

## 7. Operating it

```bash
curl https://api.yourdomain.com/api/health     # queue depth, model, quota limits
sudo journalctl -u foundervoice -f             # logs
```

**Back up** `data/foundervoice.db` — it holds every session, the Voice Memory,
and the quota counters. A daily copy to object storage is enough.

### Known ceilings

- **SQLite is single-writer.** Fine for early traffic; concurrent uploads will serialise. Postgres is the migration when that starts to hurt.
- **Transcription is synchronous and CPU-bound.** Two simultaneous uploads on a 2-core box will both be slow. `jobs.queue_depth()` on `/api/health` is the signal to watch.
- **Quota is per-IP, not per-account.** A VPN defeats it. Accounts are the real fix when it matters.
- **Hosted means recordings are on your server.** Say so on `/privacy` before you take public traffic.

### When traffic justifies it

Move transcription to a hosted Whisper API (Groq, Deepgram). `whisper_asr.transcribe()`
returns a plain dict, so the swap is contained to that one function — everything
downstream keeps working. The API then drops to ~256 MB and sub-second responses,
and the cheap tiers everywhere become viable.
