# Agent UI Mirroring — `ui_action` Protocol

## Context

The Domus agent currently writes entities directly to Supabase. The frontend sees changes via SSE `tool_call_result` events (fast) or CDC postgres_changes (reconciliation). Agent operations bypass all frontend UI pathways — no gather/scatter animations, no entrance choreography, no focus management.

**New architecture:** The agent emits explicit `ui_action` events on the SSE stream instead of writing visible entities to Supabase directly. The frontend is the sole writer — it executes the action through the same UI code paths as user interactions, writes to Supabase, then POSTs the result back to the agent. The agent blocks until the callback arrives, making the flow sequential and race-free.

**User decisions:**
- Agent attention keeps its distinct orange visual (not user selection ring), but mirrors selection lifecycle timing
- Agent actions that trigger animations queue with delays — each animation plays fully before the next begins

---

## New SSE Event Types

```typescript
// Entity mutation — agent wants the frontend to execute this
interface UIActionEvent {
  type: 'ui_action'
  action_id: string                    // e.g. "act_a1b2c3d4"
  action: string                       // "create_entity" | "update_entity" | "call_entity_tool"
  params: Record<string, unknown>      // action-specific payload
}

// Agent is about to read/edit an entity — show attention ring
interface AgentAttentionEvent {
  type: 'agent_attention'
  entity_id: string
  intent: 'reading' | 'editing'
}

// Clear all attention rings
interface AgentAttentionClearEvent {
  type: 'agent_attention_clear'
}
```

These join the existing `text_delta`, `tool_call_start`, `tool_call_result`, `done`, `error` events. The existing events continue to work for non-mirrored operations (reads, web search, query, internal entities).

---

## Plan

### Step 1: Extend SSE type definitions

**File:** `core/agent-chat/agentStreamTypes.ts`

Add `UIActionEvent`, `AgentAttentionEvent`, `AgentAttentionClearEvent` interfaces to the `AgentSSEEvent` union type. No logic change — just type declarations.

---

### Step 2: Create action-result callback endpoint

**New file:** `app/api/agent/action-result/route.ts`

Thin proxy that forwards the action result to the Python agent:

```typescript
POST /api/agent/action-result
Body: {
  action_id: string,
  space_id: string,
  user_id: string,       // overwritten from auth session, like /api/agent
  success: boolean,
  result?: { id, type, ... },   // entity payload on success
  error?: string                // error message on failure
}
```

Route authenticates via Supabase cookie, overwrites `user_id`, validates `space_id` ownership, then forwards to `${DOMUS_AGENT_URL}/agent/action-result` with service token. Fire-and-forget from the frontend's perspective (no response body needed beyond 200 OK).

---

### Step 3: Create `agentActionInterpreter.ts`

**New file:** `core/agent-chat/agentActionInterpreter.ts`

Central module with three responsibilities:

**A. AgentActionQueue** — FIFO queue that serializes spatial animations:

```typescript
interface QueuedAction {
  execute: () => Promise<void> | void
  durationMs: number
}
```

- Folder gather: 700ms (600ms phases + buffer)
- Folder scatter: 600ms (500ms + buffer)
- Eject: 400ms
- Regular entity creation/update: 0ms (non-blocking, Framer Motion handles entrance)
- Queue drains sequentially: execute action → wait duration → next
- Each action's `execute()` performs the store mutation, Supabase write, AND fires the action-result callback

**B. Action handlers** — one per `ui_action.action`:

`handleCreateEntity(actionId, params, context)`:
| Param `type` | Behavior |
|--------------|----------|
| Non-folder | `addPending` → create entity via `createEntityFromApp` or build from params → `upsert` → `setFocused` → Supabase write → callback `{ success: true, result: entity }` |
| Folder | `addPending` with `_agentFolder: true` marker → `upsert` (suppressed entrance) → Supabase write → callback |

`handleUpdateEntity(actionId, params, context)`:
- `setAgentActive(id)` → apply updates to entity store → `setFocused(id)` → Supabase write → `clearAgentActive(id)` → callback

`handleCallEntityTool(actionId, params, context)`:
| `tool_name` | Behavior |
|-------------|----------|
| `add_children` | `markGathering(childIds)` → queue `gatherEntities(childIds, folderPos, folderId)` at 700ms → after animation, write folder + children to Supabase → callback |
| `scatter` | `markScattering(childIds)` → queue `scatterFolder(folderId, viewport)` at 600ms → after animation, write all entities to Supabase → callback |
| `remove_child` | `markScattering([childId])` → queue `ejectFromFolder(folderId, childId, viewport)` at 400ms → write → callback |
| Other tools | Apply via `call` route as before → callback |

**C. Self-write CDC suppression** — `selfWriteIds: Set<string>` tracks entity IDs the frontend just wrote to Supabase. Auto-expires after 2s per ID. When CDC fires for an ID in this set, skip the upsert (it's our own write echoing back). This is deterministic — we know exactly when we write and what to suppress.

**D. Fallback handling** — If a `tool_call_result` arrives with an entity payload for an ID not handled via `ui_action`, treat it as a direct-write fallback (agent timed out at 15s) and `upsert` normally. This preserves the existing behavior as a safety net.

**E. Action-result poster** — helper function:
```typescript
async function postActionResult(actionId: string, spaceId: string, userId: string, success: boolean, result?: Entity, error?: string)
```
POSTs to `/api/agent/action-result`. Fire-and-forget — failures are logged but don't break the UI.

---

### Step 4: Refactor `consumeAgentStream.ts`

**File:** `core/agent-chat/consumeAgentStream.ts`

Add three new cases to the SSE switch:

```typescript
case 'ui_action':
  interpreter.handleAction(event.action_id, event.action, event.params, context)
  break

case 'agent_attention':
  useEntityStore.getState().setAgentActive(event.entity_id)
  break

case 'agent_attention_clear':
  useEntityStore.getState().clearAllAgentActive()
  break
```

Existing `tool_call_start` / `tool_call_result` cases stay for non-mirrored operations (reads, web_search, query_entities, list_entity_types, get_entity_schema). The entity upsert logic in `tool_call_result` becomes the fallback path — only fires if `ui_action` didn't handle the entity.

Move `buildPendingEntity`, `isEntityPayload`, and `pendingIndex` to the interpreter module.

---

### Step 5: Extend `gatherEntities` with optional `folderId`

**File:** `core/entityStore.ts` — `gatherEntities` method

Add optional third parameter: `folderId?: string`

The agent creates the folder first via `create_entity`, then calls `add_children`. The interpreter needs to pass the agent's folder ID to `gatherEntities` directly, skipping the shared-folder detection that would create a duplicate.

Change: If `folderId` is provided, use it directly instead of running the `sharedFolderId` detection block.

---

### Step 6: Self-write CDC suppression in `entitySync.ts`

**File:** `core/supabase/entitySync.ts`

In the CDC INSERT/UPDATE handler:
- Import `isSelfWrite` from `agentActionInterpreter`
- If `isSelfWrite(entity.id)` → skip `store.upsert`, update `previousEntities` baseline only
- This prevents the frontend's own Supabase writes from echoing back through CDC and overwriting transient animation state (`_gatherPhase`, `_scatterOrigin`)

This is simpler than the original plan's CDC suppression because we control the write timing — no race between two independent writers.

---

### Step 7: Folder entrance suppression in SpaceRenderer

**File:** `core/canvas/SpaceRenderer.tsx`

When a folder entity has `state._agentFolder: true`:
- Initial props: `opacity: 0, scale: 0` (invisible until gather animation takes over)
- Marker cleared by `gatherEntities` Phase 3 when `_gatherPhase` is cleared

---

## Data Flow

```
Agent (Python)                    SSE Stream                     Frontend
─────────────                    ──────────                     ────────
Claude decides to
create 3 notes + folder

                        ──── ui_action: create_entity (note1) ──→  addPending → upsert → focus
                                                                   → Supabase write
                        ←── POST /action-result {note1} ────────   → callback

agent unblocks, next tool
                        ──── ui_action: create_entity (note2) ──→  addPending → upsert → focus
                                                                   → Supabase write
                        ←── POST /action-result {note2} ────────   → callback

                        ──── ui_action: create_entity (note3) ──→  (same)
                        ←── POST /action-result {note3} ────────

                        ──── ui_action: create_entity (folder) ─→  addPending → upsert (hidden)
                                                                   → Supabase write
                        ←── POST /action-result {folder} ───────

                        ──── agent_attention: note1 ────────────→  orange ring on note1
                        ──── agent_attention: note2 ────────────→  orange ring on note2
                        ──── agent_attention: note3 ────────────→  orange ring on note3

                        ──── ui_action: call_entity_tool ───────→  markGathering([n1,n2,n3])
                             {folder_id, add_children,              → queue gatherEntities(700ms)
                              child_ids: [n1,n2,n3]}                → approaching → closing → done
                                                                   → Supabase writes (folder + children)
                        ←── POST /action-result {folder} ───────   → callback

                        ──── agent_attention_clear ─────────────→  clear all rings
                        ──── text_delta: "I've organized..." ───→  conversation panel
                        ──── done ──────────────────────────────→  completeTurn
```

---

## Fallback: Agent Direct-Write Timeout

If the frontend doesn't respond within 15s (disconnect, crash, browser tab closed), the agent falls back to direct Supabase writes. The frontend handles this gracefully:

1. `tool_call_result` arrives with entity payload
2. Interpreter checks: was this entity already handled via `ui_action`? (track `handledActionIds`)
3. If not → fallback upsert (existing behavior, no animation — but entity appears)
4. If yes → skip (already applied)

---

## Files Summary

| File | Change |
|------|--------|
| `core/agent-chat/agentStreamTypes.ts` | **Modify** — add 3 new event types to union |
| `app/api/agent/action-result/route.ts` | **New** — proxy callback to agent |
| `core/agent-chat/agentActionInterpreter.ts` | **New** — action handlers, queue, CDC suppression, callback poster |
| `core/agent-chat/consumeAgentStream.ts` | **Modify** — add ui_action/attention cases, delegate to interpreter |
| `core/entityStore.ts` | **Modify** — add `folderId?` param to `gatherEntities` |
| `core/supabase/entitySync.ts` | **Modify** — self-write CDC suppression |
| `core/canvas/SpaceRenderer.tsx` | **Modify** — folder entrance suppression |
| `core/agent-chat/__tests__/agentActionInterpreter.test.ts` | **New** — tests |

---

## Existing Code to Reuse

- `markGathering`, `markScattering`, `markParting` from `core/canvas/SpaceRenderer.tsx`
- `gatherEntities`, `scatterFolder`, `ejectFromFolder` from `core/entityStore.ts`
- `setFocused`, `setAgentActive`, `clearAgentActive`, `clearAllAgentActive` from `core/entityStore.ts`
- `addPending`, `removePending` from `core/entityStore.ts`
- `SPRING.folder`, `SPRING.agent` from `lib/motion.ts`
- `buildPendingEntity`, `isEntityPayload` from current `consumeAgentStream.ts` (move to interpreter)

---

## Edge Cases

1. **Agent creates entities then immediately gathers** — Sequential by design: agent blocks on each `ui_action` callback. Creates finish with animations before gather starts. Queue adds extra buffer for spatial operations.

2. **Self-write CDC echo** — Deterministic suppression. Frontend writes entity, marks it in `selfWriteIds`, CDC fires ~200ms later, suppressed. Auto-expires after 2s.

3. **Agent timeout fallback** — If frontend takes >15s (unlikely for non-spatial ops, possible if gather animation is slow + Supabase write is slow), agent writes directly. Frontend detects via `tool_call_result` for an entity not in `handledActionIds` and upserts normally. No animation, but no data loss.

4. **Tab backgrounded during agent turn** — Browser may throttle timers. Animation queue durations may over-run. The callback still fires eventually, just delayed. Agent's 15s timeout is generous enough to handle this.

5. **Parallel non-spatial agent operations** — `read_entity`, `query_entities`, `web_search`, `list_entity_types`, `get_entity_schema` continue as `tool_call_start`/`tool_call_result` events, unaffected by `ui_action` protocol.

6. **Multiple rapid creates (no gather)** — Each `ui_action: create_entity` blocks the agent. Entities appear one at a time with entrance animation. `durationMs: 0` in queue so Framer Motion overlap is fine.

---

## Verification

1. **Unit tests** — `agentActionInterpreter.test.ts`:
   - `create_entity` for card → pending + upsert + focus + callback fired
   - `create_entity` for folder → suppressed entrance + callback
   - `call_entity_tool` with `add_children` → `markGathering` + queued `gatherEntities` + callback after 700ms
   - `call_entity_tool` with `scatter` → `markScattering` + queued `scatterFolder` + callback after 600ms
   - Queue serialization: two spatial actions execute sequentially
   - Self-write CDC suppression: IDs added on write, expire after 2s
   - Fallback: `tool_call_result` for unhandled entity → normal upsert

2. **Integration test** — Trigger agent from UI, observe:
   - Entity creation animates in (opacity 0→1, scale, y-slide)
   - Folder gather plays 3-phase approaching→closing→done animation
   - Folder scatter plays radial spread with stagger delays
   - Agent-focused entities show orange attention ring before action, cleared after
   - No duplicate entities from CDC
   - Agent stream completes without hanging (callbacks fire correctly)

3. **Existing tests** — Full Vitest suite, no regressions
