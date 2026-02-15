Pick up a task and set up the working context.

## Steps

1. Read `docs/TASKS.md` and list available tasks
2. If $ARGUMENTS is provided, match it to a task or treat it as a new task description
3. Find relevant scenarios in `docs/scenarios/` that map to the selected task
4. Read the relevant sections of `docs/ARCHITECTURE.md` and `docs/DESIGN-DIRECTION.md` for the task's domain
5. Create a feature branch: `feat/<short-task-name>`
6. Summarize: what you're building, which scenarios apply, which docs you read, and what's the first step

## Rules

- If no matching scenario exists, flag it — don't start implementing without one
- If the task description in TASKS.md is incomplete, ask for clarification before proceeding
- Read OPS.md for the full agent workflow — this command covers steps 1-4

$ARGUMENTS
