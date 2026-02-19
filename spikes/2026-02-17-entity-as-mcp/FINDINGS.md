# Entity-as-MCP Spike — Findings

**Date:** 2026-02-18
**Status:** Complete — validated, ready for productionisation decisions
**Branch:** `spike/entity-as-mcp` (worktree `.worktrees/spike-entity-mcp`)
**Agent changes:** `Domus-Agent` main branch (marked with `# SPIKE: entity-as-mcp`)

---

## The Question

Can entities self-describe their capabilities via MCP tool schemas, so the agent discovers and calls structured tools instead of raw state writes — without any per-entity code in the agent?

---

## Answer: Yes

Two new generic tools (`get_entity_schema`, `call_entity_tool`) replace raw `update_entity` state writes for app entities. The agent discovers capabilities at runtime from a single endpoint. Zero per-type logic in agent code. State-computed schemas correctly gate tools based on entity state, and the protocol self-corrects when state changes mid-turn.

---

## What We Built

### Frontend (11 files changed/added)

| Layer | File | What |
|-------|------|------|
| Types | `apps/_types.ts` | `ToolSchema` interface, `getSchema` on `BuiltInApp` |
| Calendar | `apps/calendar/index.ts` | Static schema — 2 tools (`set_view`, `set_date`) |
| Sounds | `apps/sounds/index.ts` | State-computed schema — 8 tools stopped, 5 playing |
| Auth | `core/supabase/service.ts` | Service role client (bypasses RLS) |
| Auth | `app/api/_auth.ts` | Dual auth: Bearer token (agent) / session cookie (browser) |
| API | `app/api/entities/[id]/schema/route.ts` | GET — returns MCP tool schemas |
| API | `app/api/entities/[id]/call/route.ts` | POST — executes tool via reduce, writes state, returns fresh schema |
| Tests | 4 test files | 28 tests covering schemas, routes, auth, error paths |

### Agent (4 files changed)

| File | What |
|------|------|
| `config.py` | `DOMUS_FRONTEND_URL` (optional, defaults to localhost:3000) |
| `agent/tools.py` | 2 tool definitions, 2 HTTP handlers, updated dispatcher |
| `agent/context.py` | System prompt: prefer `get_entity_schema` + `call_entity_tool` over raw writes |
| `tests/test_tools.py` | 13 new tests (69 total in file, 173 total in suite) |

### Test Results

- Frontend: **820 tests passing** (104 files)
- Agent: **173 tests passing**

---

## Key Findings

### 1. `reduce` already does the work

The single biggest finding. The frontend already has a complete state machine per app — the `reduce(state, action, params)` function handles every valid state transition. `getSchema` just documents what `reduce` already handles. We didn't build new execution logic; we exposed existing logic via an API route.

**Implication:** Adding schema support to a new app is ~30 lines of schema definitions + wiring. The hard part (the state machine) already exists.

### 2. State-computed schemas work without agent complexity

Sounds proved the dynamic case: pattern-editing tools (`toggle_step`, `clear_pattern`, `clear_all`) disappear when playing. The agent handles this with zero special logic because:

- `call_entity_tool` returns fresh schema in every response
- Invalid tool calls return `tool_not_available` + current schema
- Agent self-corrects in the same turn

The protocol absorbs all state-change complexity. Agent code is completely generic.

### 3. The co-location + sync test pattern catches drift

Every app's schema test asserts: for each tool name in `getSchema()`, calling `reduce(state, toolName, minimalParams)` returns a new state reference (not the default pass-through). This catches:

- Tool added to schema but no matching `reduce` case
- `reduce` case renamed but schema not updated
- Tool removed from `reduce` but still in schema

Cheap to write, runs in <5ms per app, catches real bugs.

### 4. Dual auth is the right boundary

Service token (agent) and session cookie (browser) are fundamentally different auth flows that shouldn't be mixed. The discriminated union in `_auth.ts` keeps them clean:

- Service token path never imports `cookies()` — safe for agent calls where no cookie jar exists
- Cookie path never sees the service token
- Both paths write via service client for consistency (ownership already verified)

### 5. Schema caching is mostly unnecessary

NOTES.md spent time on cache TTL design. In practice, `call_entity_tool` returns the fresh schema on every response. The agent only needs `get_entity_schema` once at the start of an interaction — subsequent calls are redundant because each tool call response includes the updated schema. Session-level caching is a nice-to-have optimisation, not a correctness requirement.

---

## What's Missing for Production

### Must-have

| Gap | Why it matters | Effort |
|-----|---------------|--------|
| **Input validation** | `call_entity_tool` passes params straight to `reduce` without validating against `inputSchema`. Malformed params could corrupt state. | Medium — validate against JSON Schema before calling reduce |
| **Space ownership on writes** | Service client bypasses RLS. Application code checks ownership before reads but the write path trusts it. Needs audit. | Low — ownership already verified, just needs review |
| **Agent spike cleanup** | Agent changes are on main, marked with comments. Need to either promote to permanent or revert. | Low |

### Should-have

| Gap | Why it matters | Effort |
|-----|---------------|--------|
| **`batch_call`** | Multi-step operations (set 4 drum steps) require 4 HTTP round trips. One `batch_call` with an array of `{tool_name, params}` would be a single round trip. | Low |
| **Schema for all built-in apps** | Only calendar and sounds have schemas. Chat and settings don't — but they probably shouldn't (chat is the agent itself, settings is user-only). Note and image entities don't need schemas either (no reduce). | Low per app |
| **Error detail in agent responses** | When `call_entity_tool` fails, the agent gets a generic error. Richer errors (which param was wrong, what values are valid) would reduce retry loops. | Medium |

### Future (not this spike)

| Gap | Why it matters |
|-----|---------------|
| **Runtime app schemas via Supabase** | The architecture is designed for it (NOTES.md "Schema Authority" decision) but not implemented. When entity type is unknown, fall back to `tools` JSONB on the entity row. This is the path to user-built apps being first-class agent citizens. |
| **Compound tools** | "Set kick on beats 1, 5, 9, 13" is 4 `toggle_step` calls today. A compound tool or batch endpoint would make this one call. |
| **`delegate` escape hatch** | For operations requiring reasoning ("find a free 30-min slot"), schemas aren't enough. A future `delegate` tool could hand off to a specialised sub-agent. Schemas and delegation aren't mutually exclusive. |

---

## Architecture Decisions Confirmed

These decisions from NOTES.md were validated by implementation:

1. **Lazy schema loading** — Entity list in every context window, schemas fetched on demand. 20 entities ≠ 20 schemas in the prompt.
2. **`getSchema(state)` as the signature** — State-computed from the start, not bolted on later. The sounds app proved this on day one.
3. **MCP tool format** — Standard JSON Schema for `inputSchema`. LLM-agnostic. Agent translates to provider format once, not per-entity.
4. **Co-location of schema + reduce** — Same file, same export. Convention + tests enforce sync.
5. **API route as single endpoint** — Agent calls one URL. Built-in apps resolve from code, future runtime apps from Supabase. Agent doesn't know or care which.

---

## Recommendation

**Promote to production.** The protocol is sound, the implementation is minimal, and it meaningfully improves agent-entity interaction quality. Specific next steps:

1. Add input validation to `call_entity_tool` (validate params against `inputSchema` before calling reduce)
2. Add `batch_call` endpoint for multi-step operations
3. Decide whether to keep agent changes on main or move to a feature branch for PR
4. Ship as part of the next feature cycle — no further spiking needed
