# 09 — Known gaps (code-backed)

Items below were verified in the codebase. This is **not** a product roadmap wish list.

## Unused / partial dependencies

| Item | Evidence |
|------|----------|
| `webrtcvad-wheels` | In `requirements.txt`; **no import** under `apps/api/app/` |
| `aiofiles` | In requirements; uploads use sync file write + `await file.read` |
| Parselmouth | In `AGENTS.md` / vision; **not** in requirements or imports |
| Local Llama | In `CURSOR_PROMPT.md`; **not** implemented — DeepSeek cloud API only |
| shadcn/ui | Mentioned in AGENTS; web uses custom `components/ui.tsx` |

## Placeholders / hardcoded heuristics

| Item | Location |
|------|----------|
| `weekly_trend` on findings | Static string in `advanced_voice.build_professional_report` |
| `behavioral.reading_from_script_est` | Always `False` in pipeline payload |
| `behavioral.natural_conversation_est` | Always `True` in pipeline payload |
| Older sessions without `payload.professional` | UI shows placeholder until **reanalyze** |

## API / UX quirks

| Item | Detail |
|------|--------|
| Exercise complete not-found | Returns JSON `{ error: "not found" }` without HTTP 404 |
| `api.deleteSession` | Client method exists; **no page** calls it |
| `minSpeechRatio` mic pref | Used by Smart VAD; **no settings control** in Listen UI |
| DeepSeek key UX | Server `.env` only — no in-app BYOK settings page |
| CORS default | Includes a specific LAN IP (`192.168.1.7`) in `config.py` default — may need edit for other machines |

## Vision docs vs code

| Doc claim | Reality |
|-----------|---------|
| README “Whisper Large V3” | Default **code** default is `large-v3`; many installs use `base`/`small` via `.env` |
| CURSOR_PROMPT “fully offline LLM” | Coaching LLM is **DeepSeek HTTP**; offline path is **rule templates** |
| AGENTS Phase 5 video / diarization | **Not** implemented in routers/services |

## Ops notes

- Uvicorn without `--reload` (e.g. `start-api.bat`) does **not** pick up code changes until restart.
- Port 8000 conflicts leave the web app unable to reach analysis.
- Whisper cold start / missing weights → demo transcript so the rest of the stack still runs.

## Doc maintenance

When changing behavior, update the matching file under `docs/` in the same PR/session. Prefer citing paths (`pipeline.py`, `db.py`) over marketing language.
