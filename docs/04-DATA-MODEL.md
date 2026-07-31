# 04 — Data model

## Filesystem (`DATA_DIR`, default repo `data/`)

| Path | Purpose |
|------|---------|
| `foundervoice.db` | SQLite database |
| `audio/` | Uploaded originals + normalized `{session_id}.wav` |
| `transcripts/` | `{session_id}.json` copies of transcripts |
| `reports/` | `{session_id}.pdf` |
| `models/` | faster-whisper download cache |

## Session lifecycle statuses

Written by `pipeline.run_pipeline` / upload:

| Status | Meaning |
|--------|---------|
| `pending` | Created; analysis not finished |
| `analyzing` | Pipeline running |
| `ready` | Success; metrics/events/coach written |
| `error` | Failure; `sessions.error` holds message |

Web session page polls while `pending` or `analyzing`.

## Tables

Defined in `apps/api/app/db.py` (`SCHEMA` + `_migrate`).

### `sessions`

| Column | Notes |
|--------|-------|
| `id` | UUID string PK |
| `created_at` | UTC ISO |
| `title` | |
| `mode` | default `free` |
| `duration` | seconds |
| `audio_path` | filesystem path |
| `transcript_json` | full transcript JSON string |
| `status` | default `pending` |
| `coach_summary` | coach text |
| `error` | error message if failed |
| `listening_session_id` | FK-ish link to Smart Session (migration) |
| `conversation_index` | index within listening session |
| `exercise_key` | Labs drill key |
| `focus_json` | JSON focus meta for Labs/Practice |

### `metrics`

PK `session_id` → `sessions` CASCADE.

Flat numeric columns for list/dashboard queries, plus `payload_json` for rich nested results:

`pace`, `fillers`, `pauses`, `acoustics`, `clarity`, `language`, `pitch`, `professional`, `authority_score`, `session_context`, `behavioral`.

Investor/story columns (`hook_strength`, `ceo_presence`, …) are filled from DeepSeek pitch JSON or fallbacks; `executive_presence` / `ceo_presence` / `founder_trust` prefer professional report scores when present.

### `events`

Timestamped findings: `kind`, `start`, `end`, `severity`, `label`, `cause`, `fix`, `exercise`, `meta_json`.

### `patterns`

Voice Memory aggregates: `key` UNIQUE, `label`, `frequency`, `trend`, `last_seen`, `evidence_json`.

### `exercises` / `exercise_completions`

Catalog (seeded) + completion log for streaks.

### `practice_turns`

Investor practice chat: `role`, `content`, `scores_json`, optional `session_id`.

### `listening_sessions`

Smart Session header: `status` (`active` / ended), `settings_json`, `summary_json`, counts, `device_label`.

### `voice_profile` (singleton `id=1`)

`scores_json`, `baseline_json`, `history_json`, `hard_words_json`, `sessions_counted`.

### `voice_settings` (singleton `id=1`)

`goal_key` / `goal_label` (default Executive Presence).

### `training_plan`

Per-weakness rows: `weakness_key` UNIQUE, exercise, priority, status, `expected_gain_json`.

### `daily_missions`

One row per `mission_date`: title, focus, exercise, completed flag.

## Seeded exercises (22)

Keys from `SEED_EXERCISES` in `db.py`:

`breath_box`, `breath_diaphragm`, `articulation_twisters`, `consonant_finish`, `pause_drill_3`, `strategic_pause`, `pitch_variation`, `emphasis_keywords`, `executive_open`, `executive_presence`, `filler_fast`, `story_arc`, `confidence_stance`, `pronunciation_tech`, `hard_word_ladder`, `warmup_hum`, `lip_trills`, `chest_resonance`, `projection_support`, `open_vowels`, `tech_explain`, `investor_ask`.

## Voice Memory pattern keys

From `voice_memory.PATTERN_RULES`:

| Key | Match |
|-----|-------|
| `rush_on_intro` | `too_fast` with `start < 25` |
| `filler_overuse` | `filler` |
| `drop_technical_endings` | `pronunciation_issue` |
| `monotone` | `monotone` |
| `missing_pauses` | `missing_pause` |
| `confidence_drop_qa` | `too_quiet_variable` or `long_pause` and confidence &lt; 55 |

## Goals (`training_program.GOALS`)

`executive_presence`, `investor_pitch`, `ted_style`, `podcast_host`, `conference_speaker`, `sales_leader`, `interview_excellence`, `teacher`, `public_speaking`, `daily_communication`.

## Fresh start

`POST /api/fresh-start` with `{ "confirm": "DELETE" }` wipes user tables and media (see router). Used by Coach page.
