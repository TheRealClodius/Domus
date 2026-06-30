# Plan: Merge Review Fixes (2026-03-04)

Source: `docs/reviews/2026-03-04-main-merge-review.md`

## Accepted items

### 1. Fix action-result delivery (P0)

**Route** (`app/api/agent/action-result/route.ts`):
- Propagate upstream non-2xx as a non-2xx response to the client
- Include `{ ok: false, status, action_id }` in error body
- Keep the console.error for server-side observability

**Client** (`core/agent-chat/agentActionInterpreter.ts` — `postActionResult`):
- Check `response.ok`; if false, log structured warning with action_id and status
- Add retry with bounded exponential backoff (3 attempts, 1s/2s/4s) for network errors and 5xx responses
- Do not retry 4xx (client errors are not transient)

### 2. Turn-scoped queue isolation (P0)

**Module state** (`core/agent-chat/agentActionInterpreter.ts`):
- Add a `turnGeneration` counter (number, starts at 0)
- Increment in `resetTurnState()`
- Capture current `turnGeneration` at enqueue time
- In `drainQueue`, skip items whose captured generation !== current `turnGeneration`
- `resetTurnState()` also clears the queue array (pending items from prior turn are stale)

### 3. Missing context warning (P1)

**Stream consumer** (`core/agent-chat/consumeAgentStream.ts`):
- When `ui_action` arrives and `context` is undefined, emit `console.warn` with action_id and action name
- Post an error action-result so the agent backend knows the action was dropped (fire-and-forget, no retry needed since context absence is a client-side issue)

### 4. Contract tests (P2)

**`core/agent-chat/__tests__/agentActionInterpreter.test.ts`**:
- Unknown action name → posts error callback with "Unknown action" message
- `create_entity` with missing type → still creates (defaults to 'note')
- `update_entity` with missing id → posts error callback

**New: `core/agent-chat/__tests__/agentActionInterpreter.queue.test.ts`**:
- Enqueue action in turn A, call `resetTurnState()`, verify turn A callback never fires
- Enqueue in turn A, resetTurnState, enqueue in turn B → only turn B callback fires

**New: `app/api/agent/action-result/__tests__/route.test.ts`** (or co-located):
- Mock upstream returning 502 → route returns non-2xx to client
- Mock upstream returning 200 → route returns `{ ok: true }`

## Deferred

### CDC echo suppression hardening (P1)
Valid concern but touches stabilized CDC path. Separate spike recommended.

## Documentation sync

After implementation:
- Update `docs/TASKS.md` — add "Agent action reliability" section under In Progress with completed items
- Update `docs/ARCHITECTURE.md` — add a "Delivery guarantees" subsection in the agent protocol section documenting retry semantics and turn isolation
- Mark review items as addressed in `docs/reviews/2026-03-04-main-merge-review.md`

## Success criteria

- Upstream action-result failures return non-2xx to the client
- `postActionResult` retries transient failures with backoff
- Stale queued actions from a prior turn are skipped after `resetTurnState()`
- Missing stream context logs a warning and posts an error result
- All new behavior has test coverage
