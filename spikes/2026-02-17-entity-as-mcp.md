# Spike: Entity-as-MCP

**Date:** 2026-02-17
**Status:** Open — not yet run
**Author:** Design discussion between user + Claude

---

## The Question

Can the Domus agent accomplish complex entity operations using **only 4–5 top-level tools** plus per-entity runtime-discovered schemas — with zero hardcoded per-type logic in the agent?

This is a feasibility and design spike. It does not produce shippable code. It produces decisions.

---

## Why This Matters

Right now the agent has to know about every entity type to do anything useful with it. That means:
- Every new app type requires an agent update
- The agent carries growing per-type knowledge
- Novel or user-invented entity types are impossible to support

If entities self-describe their capabilities at runtime, the agent becomes open-ended. It can work with a `habit_tracker` it has never seen before the same way it works with a `calendar` — by asking "what can I do with you?"

The key property: **capabilities are discovered at runtime, not baked in**.

---

## Open Questions (none pre-decided)

These are the decisions the spike is trying to make. Resist closing them early.

### 1. Per-type vs per-instance schemas

**Per-type:** Schema is defined once for `type: 'calendar'`. All calendar entities share it. Simpler, less data, easier to version.

**Per-instance:** Schema is stored on the entity row (e.g. a `tools` JSONB column or within `state`). Instances of the same type can have different capabilities. Enables agent-authored schemas for novel entity types.

*Key tension:* Per-instance unlocks novel entities. But it means schema and implementation can silently diverge — the agent calls a tool the component doesn't handle.

### 2. Static vs state-computed schemas

**Static:** The tool list is fixed. `calendar` always exposes `{set_view, set_date, create_event}`.

**State-computed:** Available tools change based on `entity.state`. A calendar event that has been RSVP'd loses `{accept, decline}` and gains `{reschedule, cancel}`. The schema is `f(state) → tools`.

*Key tension:* State-computed is more correct. But who computes it — the React component, an API route, or the agent reading raw state? The computation has to live somewhere the agent can reach.

*Note:* The existing `reduce(state, action, params)` pattern in app definitions (`apps/calendar/index.ts:20`) is already proto-tool-dispatch. The action names (`set_view`, `set_date`) are proto-tool names. State-computed schema could be a natural extension of this.

### 3. Who serves the schema to the agent?

Three candidates:

**A — API route:** `/api/entities/[id]/schema` reads the entity row, looks up its type, returns the computed tool list. The Python agent fetches it. Clean, testable, separated from UI.

**B — Client-mediated:** Agent sends a request via SSE, frontend component responds with its schema. Schema is always in sync with the component implementation. But: the client is a browser, not a server — latency, reliability, and offline concerns apply.

**C — Supabase direct:** Agent reads the entity row directly; schema is a column. No extra hop. Works for static per-instance schemas. Breaks down if schema must be computed from state.

These aren't mutually exclusive. Option A can delegate computation to the same logic as Option C, but serve it over HTTP.

### 4. Is `delegate` first-class or an escape hatch?

**Escape hatch:** `delegate(entity_id, task: string)` is just a string → sub-agent call. The entity's sub-agent handles it however it wants. Simple to add, hard to standardize.

**First-class:** `delegate` is part of the entity tool schema with typed input/output. The Domus agent knows what kind of task is delegatable, and the sub-agent's response has a defined shape. More complex, more composable.

*Key question:* Does `delegate` need to be in the schema at all? Or is it implicit — any entity *can* be delegated to, and the agent just knows that?

### 5. Schema ↔ component sync

The schema describes what the agent *can* do. The React component (or API handler) *implements* it. If they drift, the agent calls a tool that silently fails or does nothing.

Options:
- Co-locate schema with `reduce` in each app's `index.ts` (convention, not enforced)
- Derive the schema from `reduce`'s case labels at build time (fragile but automatable)
- Runtime validation: `call_entity_tool` returns a structured error if the action isn't in the entity's current schema
- Test coverage: every schema tool has a test asserting `reduce` handles it

### 6. Agent-authored schemas for novel entities

If schemas are per-instance and stored in Supabase, the agent could:
1. Receive "I want a mood tracker"
2. Create a new entity (`type: 'mood_tracker'`)
3. Generate a JSON schema describing its tools (`log_mood`, `get_history`, `set_goal`)
4. Store that schema on the entity row
5. On the next turn, read it back and call `log_mood`

No developer involved. This is the fully open-ended version. It requires:
- A `tools` column (or `state.tools`) the agent can write to
- A frontend component that can execute arbitrary tool calls (a generic reducer or an agent-driven block renderer)
- Trust model: what can a schema-generated tool actually *do*? Needs sandboxing.

---

## The Spike: Four Experiments

Each experiment is a focused probe. Run them in order — each one informs the next.

---

### Experiment 1 — Formalize existing `reduce` as a tool schema

**Goal:** Prove the core loop works end-to-end on the simplest possible case.

**What to build (minimal):**
- Add a `getSchema(state)` export to `apps/calendar/index.ts` that returns a JSON schema array for `set_view` and `set_date`, using the existing action names
- Add `GET /api/entities/[id]/schema` that reads the entity, looks up its app type, calls `getSchema(entity.state)`, returns the schema
- In the Python agent, add two tools: `get_entity_schema(entity_id)` and `call_entity_tool(entity_id, tool_name, params)`
- Manually test: ask the agent "switch the calendar to week view"

**What it answers:**
- Does the protocol work at all?
- Is the API route approach viable?
- Does state-computed schema add friction vs static?

**Done when:** Agent switches calendar view without any calendar-specific code in the agent's tool handlers.

---

### Experiment 2 — State-dependent tool availability

**Goal:** Prove the schema can reflect what's *currently possible*, not just what's *always possible*.

**What to build:**
- Extend `getSchema(state)` to return different tools based on `state.view`:
  - All views: `set_view`, `set_date`
  - `day` or `week` view only: `create_event`
- Ask the agent "create an event tomorrow" while in month view
- Watch it call `set_view → day`, then re-fetch schema, then call `create_event`

**What it answers:**
- Does the agent naturally re-query the schema after a state change?
- Is state-computed schema a feature or friction?
- Does the agent handle "tool not available yet" gracefully?

**Done when:** Agent successfully chains `set_view → create_event` without being told the sequence.

---

### Experiment 3 — Agent-authored schema for a novel entity

**Goal:** Prove the system is genuinely open-ended — not just flexible for known types.

**What to build:**
- Add a `tools` JSONB column to the `entities` table (or use `state.tools`)
- Add a top-level agent tool: `define_entity_tools(entity_id, tools: JSONSchema[])`
- Create a blank entity with `type: 'habit_tracker'` and no app registration
- In one agent turn: "create a habit tracker for daily meditation" — agent creates entity + defines tools
- In the next turn: "log today's meditation" — agent reads schema, calls `log_mood` or equivalent

**What it answers:**
- Is per-instance schema viable in practice?
- Can the agent author a usable schema without developer help?
- What's the minimum frontend required to execute arbitrary tool calls?

**Done when:** A two-turn conversation creates and uses a novel entity type with no developer writing app code.

---

### Experiment 4 — Delegate for domain reasoning

**Goal:** Understand when schema-only breaks down and `delegate` is needed.

**What to build:**
- Add `delegate(task: string)` as an exposed tool on the Calendar entity schema
- When the agent calls it, spawn a sub-agent with: the calendar entity's full state, all events in its state, and the task string
- Sub-agent returns a structured response (e.g. `{ suggested_time: ISO, reasoning: string }`)
- Test prompt: "find me a free 30-minute slot next week for a dentist appointment"

**What it answers:**
- Does `delegate` feel natural or forced?
- Should `delegate` be in the entity schema, or implicit on all entities?
- What shape should the sub-agent response have?
- Is the schema-only approach sufficient 90% of the time, with `delegate` as a genuine escape hatch?

**Done when:** Agent finds and proposes a free slot without the top-level Domus agent knowing anything about calendar event parsing.

---

## The 4–5 Top-Level Agent Tools (Current Draft)

These are the tools that would remain after entity-specific tools are removed from the agent. Subject to revision after the spike.

```
list_entities(filter?: { type?, presentation?, archived? }) → Entity[]
get_entity_schema(entity_id) → { tools: ToolSchema[] }
call_entity_tool(entity_id, tool_name, params) → { ok, result, error? }
delegate_to_entity(entity_id, task: string) → { result, reasoning }
create_entity(type, initial_state?, presentation?) → Entity
```

`create_entity` may be the one remaining type-aware tool — or it too could become schema-driven if entity types are registered in Supabase.

---

## What This Spike Does NOT Answer

- Full implementation across all existing entity types
- Schema versioning and migration strategy
- Production API auth/ownership checks on `call_entity_tool`
- How the frontend component knows what arbitrary tools *mean* (the generic reducer problem)
- Multi-entity operations (agent acting on several entities in one turn)

---

## Existing Code to Build On

| Location | Relevance |
|---|---|
| `apps/calendar/index.ts:20` | `reduce(state, action, params)` — proto-tool-dispatch, action names are proto-tool names |
| `apps/calendar/types.ts` | `CalendarState`, `CalendarEventState` — state shape the schema would describe |
| `lib/types.ts:29` | `Entity.state: Record<string, unknown>` — where per-instance schema could live |
| `apps/_types.ts` | `BuiltInApp` — where `getSchema` export would be added |
| `app/api/agent/route.ts` | Existing SSE proxy — `get_entity_schema` and `call_entity_tool` would pass through here |

---

## Spike Output (fill in after running)

- [ ] Verdict on per-type vs per-instance
- [ ] Verdict on static vs state-computed
- [ ] Chosen schema authority (API route / client / Supabase)
- [ ] `delegate` shape decided
- [ ] Draft `getSchema` interface for app definitions
- [ ] Recommendation: proceed / pivot / park
- [ ] TASKS.md update: move Entity-Discoverable Actions to Up Next if green
