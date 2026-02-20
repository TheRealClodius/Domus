# Domus

## Stack
Next.js 15 · React 19 · Zustand · Tailwind v4 · Supabase · Python FastAPI (agent)

> **Note:** The Domus agent (Python FastAPI) lives in a separate repository. This repo is the frontend only.

## Key Docs
- `docs/ARCHITECTURE.md` — system design, data model, stack decisions
- `docs/DESIGN-DIRECTION.md` — visual identity, component patterns, tokens
- `docs/TASKS.md` — what to build next
- `docs/OPS.md` — full dev process, tooling, and rationale
- `docs/scenarios/` — user scenarios that drive tests and features

## Workflow
1. Every feature starts from a user scenario, not a tech spec
2. Write tests first, implement second
3. No code ships without a test proving the scenario works
4. Feature branch per task, PR to main, no direct commits to main

## Commands
| Command | When |
|---------|------|
| `/spike` | Uncertain about feasibility — explore before planning |
| `/start-task` | Pick up a task, find scenarios, create feature branch |
| `/sync-docs` | After coding — update TASKS.md, check doc drift |
| `/diagnostics` | Health check — lint, tests, stale TODOs, broken refs |
| `/create-app` | Build a new built-in app — types, tests, components, registry |
| `/agent-check` | Space agent health — context, tools, schema, evals |

## Key Patterns
- Entity IDs must be **`crypto.randomUUID()`** — the `entities.id` column is `uuid` in Postgres. `ulid()` or prefixed strings silently fail on upsert. `ulid()` is only for local-only IDs (e.g. chat context items) that never touch Supabase
- Google Calendar events are **ephemeral** — fetched on demand via API route, never stored as entities
- Third-party OAuth tokens live in the `integrations` table, not on the `users` table
- Server-side env vars `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are needed for token refresh (same creds as Supabase Google provider)
- Entity `left`, `top`, `width`, `height` go in Framer Motion's **`animate` prop**, never CSS `style`. `style` teleports; `animate` springs. Per-property transitions let entrance and repositioning use different springs.
- **Mark-and-clear for user gestures** — when visual position diverges from store (drag, resize), call `markJustDragged(id)` before the store update so `getEntityTransition` returns `duration: 0`. Clear with `setTimeout(0)`, **not** `requestAnimationFrame` (React 19 batching can defer renders past rAF).
- **Canvas ≠ viewport origin** — entity positions are relative to `[data-testid="canvas"]`, which has `inset: 12` (20 with sheet open). Any code outside the canvas computing entity positions must subtract the canvas element's `getBoundingClientRect()` to convert viewport coords → canvas coords.

## Rules
- Read ARCHITECTURE.md and DESIGN-DIRECTION.md before making changes in unfamiliar areas
- Scenarios live in `docs/scenarios/` — if none exists for the feature, flag it before implementing
- Use `.claude/agents/test-writer.md` for writing tests
- Hooks run automatically on edit: Biome lint (.ts/.tsx/.js/.jsx/.json/.css), Vitest/pytest for tests
