Run a full project health check and surface issues.

## Checks

1. **Lint** — Run `npx biome check .` (frontend) and report errors. If no biome.json exists yet, note it and skip.
2. **Tests** — Run `npx vitest run` (frontend) and `pytest` (agent). If no test config exists yet, note it and skip.
3. **Stale TODOs** — Search for `TODO` and `FIXME` comments across the codebase. List each with file, line, and content. Flag any that reference completed work.
4. **Broken doc references** — Check that file paths and directory references in `docs/ARCHITECTURE.md`, `docs/OPS.md`, and `docs/TASKS.md` point to things that actually exist. List any broken references.
5. **Scenarios without tests** — Read `docs/scenarios/user/SCENARIOS.md`. For each scenario, check if a corresponding test file or test name exists. List uncovered scenarios.
6. **Summary** — Print a health report: pass/fail per check, total issues found, prioritized list of what to fix first.

## Rules

- Run checks that are possible given the current project state — skip gracefully if tooling isn't set up yet
- Do not fix issues automatically — report them and let the human decide
- Be specific: file paths, line numbers, exact error messages

$ARGUMENTS
