# Launch checklist (v1.0)

## Pre-flight

- [ ] `apps/api/.env` filled; never commit secrets
- [ ] `CONTACT_TO_EMAIL` + SMTP if you want feedback in your inbox
- [ ] `WHISPER_MODEL=base` for smoke test; `large-v3` for quality
- [ ] `CORS_ORIGINS` lists your web origins only
- [ ] `API_DOCS_ENABLED=false` in public API deploys if desired
- [ ] `NEXT_PUBLIC_API_BASE` points at your API
- [ ] `NEXT_PUBLIC_SITE_URL` set for sitemap/OG when hosting web

## Smoke test

- [ ] `GET /api/health` → ok
- [ ] Record → session ready → transcript click seeks
- [ ] Labs drill → session with Labs banner
- [ ] Practice Q&A without cloud key still replies
- [ ] Coach fillers add → reanalyze flags custom phrase
- [ ] Feedback form saves (and emails if SMTP set)
- [ ] PDF download opens
- [ ] `/welcome`, `/privacy`, `/terms` render
- [ ] Mobile nav usable; desktop sidebar trust line visible

## Deploy

- [ ] API: `docker compose up -d` or `start-api.bat` / uvicorn
- [ ] Web: `npm run build && npm start` or Vercel
- [ ] Volume `/data` persisted for Docker API

## Announce

- [ ] README + FAQ + Privacy linked from welcome
- [ ] Demo GIF/video optional (record locally; don’t upload private audio)
- [ ] Product Hunt / HN: lead with **local-first + free + Voice Memory**
