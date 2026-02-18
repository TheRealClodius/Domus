# Entity-as-MCP Spike — Working Notes

Running log of decisions, discoveries, and open threads as we work through this spike.

---

## Session: 2026-02-18

### Context
- Working in worktree: `.worktrees/spike-entity-mcp` (branch `spike/entity-as-mcp`)
- Dev server on port 3002
- Starting with conceptual discussion before any experiments

### Decision: Schemas vs Agent Swarm

**Resolved: Schemas for the 90% case.**

Two competing architectures were considered:

- **Schemas:** Entities expose tool schemas, Domus Agent discovers and calls them directly. One brain, simple infra, cheap per turn.
- **Agent Swarm:** Each entity is a mini-agent, Domus Agent delegates. Deep domain reasoning per entity, but expensive, slow, hard to coordinate.

Schemas win the default case. Simple operations (switch view, set date, toggle play) are instant via schema call — spinning up a sub-agent for these is overkill. The swarm model only wins when an entity needs *reasoning* (e.g. "find me a free 30-min slot"). These aren't mutually exclusive — schemas first, `delegate` as a future escape hatch if needed. But for this spike we validate schemas only.

### Principle: Lazy Schema Loading

**Core principle for the entire entity-as-MCP architecture.**

Schemas are NOT crammed into every agent context window. The protocol is lazy:

1. Agent always has the **entity list** (types, IDs, summaries) — lightweight, always in context
2. Agent decides it needs to interact with an entity → calls `get_entity_schema(entity_id)`
3. Schema is returned and used for that turn
4. **Session-level cache:** schema is cached so if the agent needs the same entity again in a few minutes, no re-fetch
5. Cache expires after X time (TBD) — stale schemas get re-fetched
6. State-computed schemas: if the entity's state changes, cache should invalidate (or agent re-fetches)

This keeps the context window lean. 20 entities on the space doesn't mean 20 schemas in every prompt — just the ones the agent is actively working with.

### Decision: Schema Authority

**API route primary, Supabase fallback.**

`GET /api/entities/[id]/schema` is the single endpoint the agent calls. Internally it resolves in order:

1. **App registry lookup** — if entity type matches a built-in app, call `getSchema(state)` from code. State-computed, always in sync with the component.
2. **Supabase fallback** — if entity type is unknown (runtime-built app), read `tools` JSONB from the entity row. Static schema, written by the builder agent.

The agent doesn't know or care which path served the schema. One endpoint, two sources. The fallback path is future work (runtime app builder spike) but the architecture accommodates it from day one.

Frontend-mediated was rejected — requires browser to be open, can't support headless/background agent operations.

### Decision: Per-type vs Per-instance Schemas

**Both — depends on the source. Not a choice.**

- Built-in apps: `getSchema(state)` lives in code → per-type. All calendars share the same schema function.
- Runtime-built apps: schema stored on entity row → per-instance. Each entity carries its own.

The API route abstracts the difference. Agent doesn't know which it got.

### Decision: Static vs State-Computed Schemas

**State-computed from the start. `getSchema(state)` is the signature.**

Tool list changes based on entity state. The spike must prove this works across the full dynamic spectrum — not just static tool lists.

**Agent needs zero special logic for this.** The protocol handles freshness:

1. `get_entity_schema(entity_id)` → returns tools computed from current state
2. `call_entity_tool(entity_id, tool, params)` → executes + returns `{ok, result, schema}` (refreshed schema in every response)
3. Invalid tool call (state changed) → returns `{ok: false, error, schema}` — agent retries with fresh schema

- **Intra-turn:** Every tool response includes the updated schema. No re-fetch needed.
- **Inter-turn:** Agent is stateless. Fresh `get_entity_schema` call at start of each interaction.
- **Race condition** (user changes state mid-turn): `call_entity_tool` returns error + current schema. Agent self-corrects.

Agent code is completely generic. Zero per-type logic, zero cache management, zero state-change awareness.

### Open Threads

- ~~What's the right cache TTL for schemas?~~ Mostly moot — `call_entity_tool` returns fresh schema on every call. Session-level caching is optional optimization.
- ~~Should `call_entity_tool` auto-return the updated schema?~~ Yes — decided above.
- ~~How does the agent know an entity's state changed?~~ It doesn't need to — protocol handles it.
- ~~What does the `getSchema(state)` return type look like concretely?~~ MCP tool format — decided below.
- ~~Schema ↔ component sync~~ Co-location + tests — decided below.

### Discovery: Agent Has Zero Per-Type Tools

The Python agent (Domus-Agent repo) already has only 4 generic tools: `create_entity`, `update_entity`, `query_entities`, `read_entity`. No entity-specific tools exist. The agent currently raw-writes state via `update_entity(id, {state: {view: "week"}})` — no validation, no discovery.

Entity-as-MCP reframes as: **structured tool calls with validation vs raw state writes.** Agent changes are minimal:
1. Add `get_entity_schema` + `call_entity_tool` to `TOOL_DEFINITIONS`
2. Keep `update_entity` for non-app-specific changes (position, content, presentation)
3. Update system prompt to prefer schema tools for app-specific actions

No structural changes to agent loop, SSE events, or dependencies.

### Decision: Full End-to-End Spike

Both repos are local. Spike scope includes:
- Frontend (worktree `spike/entity-as-mcp`): API routes + `getSchema` on apps
- Agent (main branch of Domus-Agent): add 2 tools, update system prompt

**Caution:** Agent repo is on main, not a worktree. Changes must be additive — don't break existing behavior. Add comments marking spike code. Clean up after spike concludes.

### Decision: Schema ↔ Component Sync

**Co-location + tests. No magic.**

- `getSchema(state)` lives next to `reduce` in the same `index.ts` file. Convention enforces proximity.
- Each app has a test asserting every tool name from `getSchema(state)` has a matching `reduce` case, and vice versa.
- Bonus safety net: `call_entity_tool` API route checks `getSchema(state)` before calling `reduce` — returns structured error if tool isn't in current schema. Not the primary enforcement, just a runtime guard.

### Decision: Schema Format

**MCP tool format. LLM-agnostic.**

`getSchema(state)` returns an array of MCP-standard tool definitions:

```
{
  name: "set_view",
  description: "Switch the calendar view mode",
  inputSchema: {
    type: "object",
    properties: {
      view: { type: "string", enum: ["month", "week", "day", "agenda"] }
    },
    required: ["view"]
  }
}
```

- Uses standard JSON Schema for `inputSchema` — any LLM SDK can consume it.
- The Python agent translates to whatever provider format it needs (Anthropic, OpenAI, etc.). One-time mapping on the agent side, not per-entity.
- Doesn't couple the frontend to any specific LLM. Space stays LLM-agnostic.
