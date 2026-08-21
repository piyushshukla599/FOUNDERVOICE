---
title: FounderVoice API
emoji: 🎤
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# FounderVoice API

Backend for [FounderVoice AI](https://github.com/piyushshukla599/FOUNDERVOICE) —
transcription, delivery analysis, and coaching for founder pitches.

Copy `deploy/container/Dockerfile` from the repo into this Space as `Dockerfile`
— it is shared with the Azure deployment so the two cannot drift. The app
source is cloned from GitHub at build time, so after pushing to `main` use
**Settings → Factory rebuild** to redeploy.

Note: Hugging Face now requires a PRO plan to create Docker Spaces; only Static
Spaces are free. See `deploy/azure/deploy.sh` for a free alternative.

## Required secrets

Set these under **Settings → Variables and secrets**:

| Name | Kind | Value |
| --- | --- | --- |
| `GROQ_API_KEY` | Secret | Your key from <https://console.groq.com/keys> |
| `QUOTA_SECRET` | Secret | 64 hex chars. `python -c "import secrets;print(secrets.token_hex(32))"` |
| `CORS_ORIGINS` | Variable | The exact frontend origin, e.g. `https://foundervoice.app` |

`QUOTA_SECRET` must stay the same across rebuilds, or every visitor's free-tier
counters reset to zero.

## Note on storage

Free Spaces have ephemeral disk: sessions and Voice Memory are lost whenever the
container restarts. Each visitor gets their own workspace, keyed by a signed
cookie, but nothing here survives a redeploy.
