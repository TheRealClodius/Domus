Review what changed in this session and update living documents.

## Steps

1. Run `git diff main --stat` to see what files changed
2. Read `docs/TASKS.md` — mark completed work, note key decisions made during implementation
3. Check if any changes touch areas described in `docs/ARCHITECTURE.md` — if so, **stop and tell the human exactly what needs changing and why**. Do not edit ARCHITECTURE.md without explicit approval. This is the founding document — changes must be deliberate
4. For each implemented feature or behavior change, verify a corresponding scenario exists in `docs/scenarios/`. If missing, draft one and ask for confirmation before writing
5. Summarize what was synced and what needs human review

## Rules

- Do not silently skip docs that look "fine" — explicitly confirm each one is current
- ARCHITECTURE.md is the founding document — never edit it without explicit human approval. Show exactly what you'd change and why, then wait
- Scenarios must follow the existing format in `docs/scenarios/user/SCENARIOS.md`

$ARGUMENTS
