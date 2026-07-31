# 08 — Local analysis vs DeepSeek (optional)

## Design intent

- **Voice path is local:** mic, files, Whisper, SQLite, acoustic/professional metrics, Voice Memory, Labs.
- **DeepSeek is optional:** richer natural-language coach, investor JSON, language JSON, Practice Mode dialogue.

`deepseek_chat` returns empty string when the API key is missing or starts with `sk-your`. Callers then use **rule / heuristic fallbacks**.

## What works with no DeepSeek key

| Feature | Source |
|---------|--------|
| Record / upload / Labs / Practice / Listen analyze | Local pipeline |
| Transcript (real Whisper or demo-fallback) | Local |
| WPM, fillers (built-in + **custom** from Coach UI), pauses, clarity, acoustics | Local |
| Professional voice report + findings | `advanced_voice.py` |
| Voice Memory / profile / Labs / missions | Local |
| **Coach summary** | `coach_templates.build_coach_summary` — DeepSeek-shaped sections for Record, Labs, Practice, Listen |
| **Pitch / investor JSON** | `coach_templates.build_pitch_scores` (transcript + metrics heuristics) |
| **Language scores** | `coach_templates.build_language_insights` |
| **Practice investor Q&A** | `coach_templates.build_practice_reply` (rotating hard questions + critique) |
| PDF report | Local metrics + coach + findings (works either way) |

## Custom filler words

- UI: **Coach → Custom filler words**
- API: `GET/POST/DELETE /api/fillers`
- Stored in SQLite `custom_fillers`; merged with builtins on every `detect_fillers` call
- Survives Fresh start (session wipe keeps lexicon)

## What DeepSeek improves (when configured)

| Call | File function | Effect |
|------|---------------|--------|
| Coach essay | `generate_coach_summary` | Longer elite coach prose |
| Pitch structure / investor scores | `analyze_pitch_with_llm` | JSON scores + narrative fields |
| Language quality | `language_insights` | Grammar/vocab notes beyond heuristics |
| Practice Mode | `practice_investor_reply` | Adaptive hard questions |

Nothing in the pipeline **requires** DeepSeek to finish as `ready` — only the quality of those four surfaces changes.

## Cost / public launch implication

For free public **distribution** without burning your resources:

1. Ship **local** app (users run API + web on their machine).
2. Leave DeepSeek empty by default → full local coach experience.
3. Optional: user pastes **their own** DeepSeek key later (BYOK) — not implemented as a settings UI yet; today key is server `.env` only.

Hosting everyone’s Whisper + your DeepSeek key on a free public cloud is **not** how this codebase is structured.

## UI honesty

Record page Stat shows “DeepSeek: Ready | Key needed”.  
Fallback coach appends a line that DeepSeek is missing/offline. Prefer treating “Key needed” as **optional upgrade**, not a broken app.
