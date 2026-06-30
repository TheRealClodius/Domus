# Review: Latest merge into main (`f8ab30d` / PR #9)

## Scope reviewed

- `core/agent-chat/agentActionInterpreter.ts`
- `core/agent-chat/consumeAgentStream.ts`
- `app/api/agent/action-result/route.ts`
- `core/supabase/entitySync.ts`
- `core/entityStore.ts`
- `core/agent-chat/__tests__/agentActionInterpreter.test.ts`

## Executive summary

The merge is directionally strong: it cleanly introduces a `ui_action` protocol, adds optimistic/pending behavior, and introduces focused tests around the new interpreter paths.

The main opportunities are around **reliability boundaries** (action acknowledgment, queue/turn lifecycle, and CDC echo suppression tuning) and **observability** (making failure modes explicit rather than silent).

## What is working well

1. **Separation of concerns improved**
   - Stream parsing and action execution are now separated (`consumeAgentStream` vs `agentActionInterpreter`).
2. **Fallback compatibility preserved**
   - Legacy tool call results still upsert entities when needed, but now guard against double-write with `isHandledByUIAction`.
3. **Agent UX details considered**
   - Attention markers and gather/scatter animation choreography are explicit.
4. **Test coverage added for core action paths**
   - `create_entity`, `update_entity`, `add_children`, payload guards, and turn reset behavior are covered.

## Improvement opportunities (prioritized)

### P0 — Make action-result delivery honest and observable ✅

**Issue**
The API route always returns `{ ok: true }` even when the upstream agent endpoint fails. This can mask delivery failures and make retries impossible from the client side.

**Why it matters**
If `/agent/action-result` fails upstream, the frontend currently sees success and proceeds, while the backend may never receive action completion.

**Proposed change**
- In `app/api/agent/action-result/route.ts`, propagate upstream non-2xx status as a non-2xx response.
- Include lightweight structured error metadata (`status`, `action_id`) in response body.
- Add retries with bounded exponential backoff in `postActionResult` (client) for transient network errors.

### P0 — Tighten turn lifecycle around queued animations/actions ✅

**Issue**
`resetTurnState()` clears handled IDs and pending index, but does not flush/cancel any queued actions. Queue state is module-global.

**Why it matters**
Long-running queued actions from a previous turn can leak into a new turn, causing late writes or stale callbacks.

**Proposed change**
- Add queue generation token or cancelable queue entries tied to current turn ID.
- On `resetTurnState()`, increment generation and skip stale queue items.
- Add tests for cross-turn isolation (enqueue in turn A, reset, assert turn A callbacks not posted in turn B).

### P1 — Make missing stream context explicit for `ui_action` ✅

**Issue**
When `ui_action` arrives without `context`, it is silently ignored.

**Why it matters**
Silent drops create hard-to-debug divergence between agent intent and UI state.

**Proposed change**
- Emit warning telemetry and optionally post an error `action-result` when `context` is absent.
- Add a conversation-level error annotation for developer builds.

### P1 — Harden CDC echo suppression strategy (deferred)

**Issue**
Self-write suppression is time-based (`SELF_WRITE_EXPIRY_MS = 2000`).

**Why it matters**
Under latency spikes or delayed Realtime payloads, echoes may arrive after expiry and re-apply stale state.

**Proposed change**
- Prefer version-based suppression (`updated_at` or monotonic write nonce) over fixed TTL where possible.
- If TTL remains, make it configurable and log suppression misses in dev mode.

### P2 — Expand contract tests for protocol edges ✅

**Gaps**
- No tests for unknown `ui_action` names and malformed params in stream integration.
- No tests for action-result API behavior under upstream 5xx/network failures.
- No tests for queue behavior across rapid sequential turns.

**Proposed change**
- Add focused tests for failure and race paths; keep them near `agentActionInterpreter` and API route.

## Suggested implementation plan

### Phase 1 (Reliability hotfixes)
1. Update `action-result` route to propagate upstream failures.
2. Add transient retry/backoff in client `postActionResult`.
3. Add minimal logging/telemetry for missing `context` in `ui_action`.

### Phase 2 (Turn isolation)
1. Introduce turn-scoped queue generation token.
2. Ensure `resetTurnState()` invalidates prior queue work.
3. Add cross-turn race tests.

### Phase 3 (CDC robustness)
1. Introduce version-aware suppression fallback.
2. Add diagnostics for suppressed vs applied CDC updates in dev.
3. Tune or remove fixed TTL dependence.

### Phase 4 (Coverage and cleanup)
1. Add failure-path tests in API and stream consumer.
2. Document delivery guarantees and retry semantics in architecture docs.

## Success criteria

- Upstream action-result failures are visible to clients and logs.
- No stale action callbacks/writes after turn reset.
- UI action drops due to missing context are explicit and diagnosable.
- CDC echo handling remains stable under delayed realtime delivery.
