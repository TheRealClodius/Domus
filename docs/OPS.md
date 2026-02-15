# Domus — Dev Process

How we build. 
For architecture see ARCHITECTURE.md. 
For design see DESIGN-DIRECTION.md.

---

## Approach: Scenario-Driven Development + TDD

Every feature starts from a user scenario (in `docs/scenarios/`), not from a technical spec. Scenarios describe what the user does and what happens. Tests are written from scenarios before implementation code. No code ships without a test that proves the scenario works.

**Flow:** Scenario → Tests → Implementation → Verification

---

## Agent Workflow

1. Read ARCHITECTURE.md, DESIGN-DIRECTION.md, and this doc
2. Pick a task from `docs/TASKS.md`
3. Find or write the relevant scenario in `docs/scenarios/`
4. Write tests first using `.claude/agents/test-writer.md`
5. Implement until tests pass
6. Run full lint + test suite
7. Open PR to `main` with a summary of what was built and which scenario it covers

---

## Living Documents

| Doc | Purpose | Update cadence |
|-----|---------|---------------|
| `docs/ARCHITECTURE.md` | System design, data model, agent design, stack | Every 3-4 sessions |
| `docs/DESIGN-DIRECTION.md` | Visual identity, component patterns, tokens | When design evolves |
| `docs/TASKS.md` | Task breakdown — what to build next | Before and after each task |
| `docs/scenarios/` | User scenarios that drive tests and features | When new behavior is defined |
| `CLAUDE.md` | Agent instructions — tight and on mission | Curated continuously |

---

## Tooling

| Concern | Tool | Notes |
|---------|------|-------|
| Frontend tests | Vitest + Testing Library | Unit + component. No E2E for v1. |
| Agent tests | pytest | Async support, fixtures |
| Lint + format | Biome | Single tool, replaces ESLint + Prettier |
| Logging | Pino | Structured JSON logs with correlation IDs |
| CI | GitHub Actions | Lint + test on every push. Agent service has its own CI in a separate repo. |

---

## Branching

Feature branch per task. PR to `main`. No direct commits to `main`.

---

## Agents

| Agent | Location | Purpose |
|-------|----------|---------|
| Test writer | `.claude/agents/test-writer.md` | Write tests and identify coverage gaps before implementing |

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/spike` | Time-boxed technical exploration to answer a feasibility question before planning |
| `/start-task` | Pick up a task from TASKS.md, find scenarios, create feature branch |
| `/sync-docs` | After coding: update TASKS.md, check ARCHITECTURE.md drift, verify scenario coverage |
| `/diagnostics` | Project health: lint, tests, stale TODOs, broken doc refs, uncovered scenarios |
| `/agent-check` | Domus space agent health: context injection, tool tests, schema caching, evals |

---

## Hooks

Configured in `.claude/settings.json`. Run automatically on every file edit (Edit/Write):

| Hook | What it does |
|------|-------------|
| `lint.sh` | Runs Biome check on changed file (.ts/.tsx/.js/.jsx/.json/.css) |
| `test.sh` | Runs related Vitest tests (.ts/.tsx) or pytest (.py) |

Hooks exit gracefully if tooling isn't set up yet (no biome.json, no vitest config).
