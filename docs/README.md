# FounderVoice AI — Documentation

**Source of truth:** this folder describes what the codebase **actually implements** as of the last doc pass.  
If something is not listed here, do not assume it exists — check the code.

| Doc | Contents |
|-----|----------|
| [01-OVERVIEW.md](./01-OVERVIEW.md) | Product intent, local-first rules, repo layout |
| [02-SETUP.md](./02-SETUP.md) | Install, env vars, how to run (Windows-focused) |
| [03-ARCHITECTURE.md](./03-ARCHITECTURE.md) | Components, data flow, what stays local vs cloud |
| [04-DATA-MODEL.md](./04-DATA-MODEL.md) | SQLite tables, directories, session modes/statuses |
| [05-PIPELINE.md](./05-PIPELINE.md) | Analysis pipeline step-by-step + thresholds |
| [06-API-REFERENCE.md](./06-API-REFERENCE.md) | Every HTTP route under `/api` |
| [07-WEB-APP.md](./07-WEB-APP.md) | Routes, nav, hooks, client API |
| [08-LOCAL-VS-DEEPSEEK.md](./08-LOCAL-VS-DEEPSEEK.md) | What works without a DeepSeek key |
| [09-KNOWN-GAPS.md](./09-KNOWN-GAPS.md) | Incomplete / unused / placeholder items found in code |
| [10-FEATURES-AND-WORKFLOWS.md](./10-FEATURES-AND-WORKFLOWS.md) | Accurate feature list + what’s inside + user walkthroughs |
| [FAQ.md](./FAQ.md) | Common questions for users & press |
| [LAUNCH.md](./LAUNCH.md) | v1.0 public launch checklist |
| [DEPLOY.md](./DEPLOY.md) | Step-by-step internet deploy (tunnel / VPS / Vercel) |

**Agent rules (product mandate):** see repo root [`AGENTS.md`](../AGENTS.md).  
**Short setup:** see repo root [`README.md`](../README.md).

## How these docs were built

Inventories were taken from:

- `apps/api/app/**` (routers, services, `db.py`, `config.py`, `main.py`)
- `apps/web/src/**` (pages, hooks, `lib/api.ts`, components)
- `apps/api/requirements.txt`, `apps/web/package.json`, `start-api.bat`, `.env.example`

Docs intentionally **do not** claim features that appear only in vision docs (`CURSOR_PROMPT.md`, roadmap phases) unless the code implements them.
