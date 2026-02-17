# Spike: Collision Detection & Spatial Self-Orchestration

**Date:** 2026-02-17
**Status:** Open — not yet run
**Author:** Design discussion between user + Claude

---

## The Question

Can entities detect collisions and orchestrate their own size and position — both individually and in agent-coordinated batches — to enable complex spatial choreography on the canvas?

Two forcing scenarios:

1. **Generation states** — multiple images being generated simultaneously tile themselves in interesting arrays, adapting to what's already on the canvas
2. **Reactive rearrangement** — when a new element enters the scene (agent chat opens, new entity spawns), existing entities move, resize, and cluster to avoid being hidden and to maintain a coherent layout

This is a feasibility and design spike. It produces decisions, not shippable code.

---

## Why This Matters

The current system places entities with a naive stacked offset (`createEntityFromApp.ts:24`) and scatters folders in a fixed 3-column grid (`entityStore.ts:231`). Entities have no awareness of each other's bounds. The architecture doc acknowledges this gap explicitly:

> **Collision detection:** The frontend layout engine handles collision avoidance when placing new entities. [...] Post-v1: consider giving the agent pixel-level position control for precise spatial arrangements.
> — `docs/ARCHITECTURE.md:126`

The user scenarios already assume this capability exists:

- *"Five cards appear on the canvas in a tiled row"* — `SCENARIOS.md:162`
- *"Ten cards appear on the canvas at once, tiled in a grid"* — `SCENARIOS.md:353`
- *"The entities begin moving — spring animations as they rearrange"* — `SCENARIOS.md:982`

Without a spatial engine, these scenarios are unrealizable. Entities stack on top of each other, generation states pile up at center, and opening agent chat hides whatever is behind it.

---

## Design Constraint: Three Levels of Control

The solution must be scalable across three tiers, not just one:

### Level 1 — Entity-level logic (self-orchestration)
Each entity knows its own spatial rules. A card knows its minimum size. A generating image knows it wants to be visible. An entity can declare spatial preferences: "I need at least 232×300", "I want to be near entity X", "I should not overlap the chat panel." This is reactive and local — no coordinator needed.

### Level 2 — Agent-level individual control
The agent positions or resizes a single entity with intent. "Move this window to the top-right." "Make this card larger." The agent has pixel-level or percentage-level control over one entity at a time, with the spatial engine ensuring the result doesn't create collisions.

### Level 3 — Agent-level batched control
The agent orchestrates multiple entities simultaneously. "Tile these 10 images in a 5×2 grid." "Cluster research cards to the left, move meeting notes to the bottom." "Clear the center for the new window." The agent issues a layout intent for N entities, and the spatial engine resolves it as one coordinated animation.

The architecture must support all three without them fighting each other.

---

## Open Questions (none pre-decided)

### 1. Where does collision detection run?

**Option A — Zustand middleware:**
A middleware layer in `entityStore.ts` that intercepts `upsert`, `updatePosition`, and `updateSize`. Every mutation passes through a collision resolver before hitting state. Entities never overlap in the store — invariant enforced at write time.

**Option B — Layout engine (separate module):**
A pure function `resolveLayout(entities, viewport, constraints) → entities` that the store calls when needed. Not middleware — explicitly invoked. The store can bypass it for user-drag (which should allow overlap). Cleaner separation but requires discipline about when to call it.

**Option C — Render-time resolution:**
`SpaceRenderer.tsx` computes resolved positions at render time. Store holds "desired" positions; renderer computes "actual" positions. Entities animate from desired to actual. Avoids store complexity but means the store doesn't reflect reality.

*Key tension:* User drag must bypass collision detection (the user is the authority). Agent placement must go through it. This asymmetry matters for where the logic lives.

### 2. What is a "collision"?

**Strict overlap:** Any pixel overlap between entity bounding boxes. Simple AABB (axis-aligned bounding box) test. Cheap to compute.

**Semantic overlap:** Overlap that *matters*. Two cards overlapping by 20px might be fine (the overlap zone might be shadow/margin). An entity hidden behind the chat panel is a collision even though the entities don't touch each other. An entity pushed off-viewport is a collision with the viewport bounds.

**Zone-based:** The canvas is divided into zones (center, quadrants, edges). Collision means two entities competing for the same zone. Coarser but enables "cluster research to the right" without pixel math.

*Key tension:* AABB is simple and correct for overlap avoidance. But the interesting choreography (generation tiling, chat-aware rearrangement) needs semantic awareness — understanding the chat panel footprint, viewport margins, and grouping intent.

### 3. How do entities declare spatial preferences?

**Option A — Static constraints on the app type:**
Each `BuiltInApp` declares spatial metadata alongside `defaultSize` and `defaultPresentation`:

```typescript
spatial: {
  minSize: { width: 232, height: 300 },
  maxSize: { width: 800, height: 600 },
  anchor?: 'center' | 'top-left' | 'near-parent',
  avoidZones?: ('chat-panel' | 'dock' | 'header')[],
  groupAffinity?: string, // entities with same affinity cluster
}
```

Simple, predictable, declared once per app type. But can't adapt to runtime state.

**Option B — Computed constraints from entity state:**
A function `getSpatialConstraints(entity) → Constraints` that reads entity state to produce constraints. A generating image might return `{ priority: 'must-be-visible', preferredLayout: 'tile-with-siblings' }` while a completed image returns `{ priority: 'normal' }`.

More expressive. But who calls it — the layout engine needs access to this function, which means importing app-specific logic.

**Option C — Constraint field on Entity:**
Add `spatial_hints` to `Entity.state` or as a top-level field. The agent or app reducer writes hints. The layout engine reads them generically. No app-specific imports.

```typescript
entity.state.spatial_hints = {
  avoid: ['chat-panel'],
  cluster: 'research-batch-abc',
  priority: 'must-be-visible',
}
```

*Key tension:* Option A is rigid. Option B couples the layout engine to app internals. Option C is flexible but relies on whoever writes the hints to get them right.

### 4. How does the agent issue batched layout commands?

The agent needs to express spatial intent for multiple entities at once. Three possible tool shapes:

**A — Explicit coordinates:**
```
arrange_entities([
  { id: "abc", position: { x: 100, y: 200 }, size: { width: 300, height: 400 } },
  { id: "def", position: { x: 450, y: 200 }, size: { width: 300, height: 400 } },
])
```
Full control. Agent computes every coordinate. Layout engine only validates and resolves collisions with non-target entities.

**B — Layout intent:**
```
arrange_entities({
  entity_ids: ["abc", "def", "ghi", ...],
  layout: "grid",        // or "row", "column", "cluster", "scatter"
  anchor: { x: 50, y: 50 },  // percentage — center of the arrangement
  options: { columns: 5, gap: 24 }
})
```
Agent declares *what* arrangement it wants. Layout engine computes *where* each entity goes. Agent doesn't need to know viewport dimensions or do math.

**C — Hybrid:**
Agent can use either explicit coordinates or layout intents. Layout intents are syntactic sugar — they expand to explicit coordinates inside the layout engine. Agent picks whichever is appropriate.

*Key tension:* Option A gives the agent maximum control but requires the agent to know viewport size, entity sizes, and do layout math — error-prone and token-expensive. Option B is declarative and clean but limits the agent to pre-defined layout algorithms. Option C is flexible but complex to implement and test.

### 5. Reactive rearrangement — push model or pull model?

When something changes (chat panel opens, new entity spawns), how do existing entities know to move?

**Push (event-driven):**
State changes emit events. `chat-panel-opened`, `entity-spawned`, `viewport-resized`. A spatial controller subscribes to these events and runs the layout engine with updated constraints. Entities animate to new positions.

**Pull (continuous):**
A `useLayoutEffect` or Zustand `subscribe` watches for any state change and re-runs collision detection every frame (or debounced). If any entity overlaps a known zone (chat panel, dock), it gets nudged.

**Explicit (agent-driven):**
The agent is aware of spatial state and explicitly rearranges. Opening chat panel is an agent action — the agent also issues `arrange_entities` to clear the center. This means the agent is always in the loop for spatial changes.

*Key tension:* Push/pull are automatic — entities stay organized without agent involvement. But automatic rearrangement can be surprising ("why did my card move?"). Agent-driven is intentional but slow — the agent has to process every spatial event.

### 6. Animation choreography for batch operations

When 10 entities move at once, they shouldn't all teleport simultaneously. But they also shouldn't take 10 seconds of sequential animation.

**Staggered spring:**
All entities start animating in the same frame but with increasing delay (e.g., 30ms stagger). Uses `SPRING.agent` physics. Creates a ripple effect — entities near the anchor move first, distant ones follow.

**Grouped spring:**
Entities animate as one mass — a single spring controls the "progress" of the entire layout change, and individual positions interpolate along their paths. Feels like the layout breathes.

**Priority-ordered:**
Entities animate in priority order. The most important entity (e.g., the newly created one) moves first and settles. Then surrounding entities adjust. Creates a clear focal point.

*Key question:* Should the agent control choreography style, or should it always be the same physics?

---

## The Spike: Four Experiments

Each experiment is a focused probe. Run them in order — each one informs the next.

---

### Experiment 1 — AABB collision resolver as a pure function

**Goal:** Prove that a stateless function can resolve overlaps for a set of entities on a known viewport.

**What to build (minimal):**
- A pure function: `resolveCollisions(entities: EntityRect[], viewport: Rect, fixedZones: Rect[]) → EntityRect[]`
- `EntityRect = { id, x, y, width, height, locked: boolean }`
- `fixedZones` = chat panel footprint, dock footprint, header footprint
- Locked entities don't move. Unlocked entities are nudged to resolve overlaps.
- Resolution strategy: push the smaller/newer entity away from the overlap along the axis of least penetration
- Unit tests with known inputs and expected outputs — no UI

**What it answers:**
- Is AABB sufficient for the common cases?
- How does the resolver handle chain reactions (A pushed into B, B pushed into C)?
- What's the performance ceiling for N entities? (Target: <1ms for 50 entities)

**Done when:** Test suite passes for: 2 overlapping entities, entity overlapping chat panel, entity pushed off-viewport (clamped), chain of 5 overlapping entities, locked entity not moved.

---

### Experiment 2 — Layout intent engine for batch placement

**Goal:** Prove that declarative layout intents produce good-looking arrangements without pixel-level agent control.

**What to build:**
- A function: `computeLayout(intent: LayoutIntent, entities: EntityRect[], viewport: Rect) → EntityRect[]`
- Support three intents:
  - `grid` — N entities in a grid with configurable columns and gap, anchored at a percentage point
  - `row` — N entities in a horizontal row, centered
  - `cluster` — N entities packed tightly near a point, with collision resolution
- Feed the output into `resolveCollisions` from Experiment 1 to handle conflicts with existing non-target entities
- Visual test: render the output positions as colored rectangles on a canvas (plain HTML, no React)

**What it answers:**
- Do the three layout primitives cover the scenarios? (generation tiling = grid, research cards = row/cluster, cleanup = cluster)
- Does the anchor-point percentage model work across viewport sizes?
- Is the output of intent → resolve visually coherent, or does the collision resolver fight the intent?

**Done when:** Visual output looks intentional (not scattered or overlapping) for: 10-image grid, 5-card row, 8-entity cluster, and a mixed case where 5 new cards tile around 3 existing locked windows.

---

### Experiment 3 — Reactive rearrangement on zone change

**Goal:** Prove that entities can automatically avoid the chat panel when it opens, without agent intervention.

**What to build:**
- Define `CanvasZones`: a set of named rectangles representing occupied UI regions (chat panel, dock, header)
- A Zustand subscriber that watches for zone changes (chat opens → new zone added)
- When zones change, run `resolveCollisions` on all unlocked entities with the updated `fixedZones`
- Apply the resolved positions via `updatePosition` with spring animation
- Test in the actual SpaceRenderer: open agent chat with 3 entities near bottom-center, watch them slide out of the way

**What it answers:**
- Does automatic rearrangement feel helpful or annoying?
- Should entities snap back when the chat panel closes, or stay where they were pushed?
- Is the Zustand subscriber pattern performant enough, or does it cause render storms?
- Does this interact correctly with user-locked entities (they shouldn't move)?

**Done when:** Opening the chat panel pushes overlapping unlocked entities out of the way with spring animation. Closing it does not move them back (they stay where they landed — user can re-drag if desired). Locked entities are unaffected.

---

### Experiment 4 — Agent-controlled batch choreography end-to-end

**Goal:** Prove the full pipeline: agent issues a layout intent → layout engine computes positions → entities animate with staggered springs → collision resolution prevents overlap with non-target entities and zones.

**What to build:**
- Add an agent tool: `arrange_entities({ entity_ids, layout, anchor, options })` that returns the computed positions
- Frontend receives the batch position update via the existing entity upsert SSE path
- `SpaceRenderer` detects batch updates (multiple entities changing position in one tick) and applies staggered animation
- Test prompt: "tile the images in a grid" with 6 image cards and 2 existing windows on canvas

**What it answers:**
- Does the end-to-end flow work without special-casing in the agent?
- Is the stagger animation visually coherent?
- How does the agent know the current viewport and entity positions well enough to issue good intents?
- Does the existing SSE → entity upsert pipeline handle batch updates without jank?

**Done when:** Agent command "tile these images" produces a smooth, staggered grid animation that avoids overlap with existing windows and the chat panel.

---

## Existing Code to Build On

| Location | Relevance |
|---|---|
| `core/entityStore.ts:93` | `updatePosition` — currently sets `locked: true`, would need a variant for layout-engine moves that preserve `locked: false` |
| `core/entityStore.ts:221` | `scatterFolder` — existing batch position update, hardcoded 3-column grid. Proves the store can handle batch mutations. |
| `core/canvas/createEntityFromApp.ts:12` | `STACK_OFFSET` / stagger logic — current naive placement. Would be replaced by collision-aware placement. |
| `core/canvas/SpaceRenderer.tsx:109` | `motion.div` with `SPRING.popIn` — animation layer where staggered batch animation would be added |
| `lib/motion.ts:7` | `SPRING.agent` — the spring config for agent-origin movement. Batch choreography would use this. |
| `lib/types.ts:8` | `EntityPosition`, `EntitySize` — the spatial primitives. May need extension for spatial hints. |
| `apps/calendar/eventLayout.tsx` | `computeOverlapColumns` — existing overlap resolution algorithm for calendar events. Proof that greedy column assignment works for 1D overlap. This spike extends the idea to 2D. |
| `core/chat/AgentChat.tsx` | Sends `canvasViewport` to agent — the agent already knows viewport dimensions. |

---

## Data Model Implications

### Minimal addition to Entity

No schema migration required for Experiments 1–3. Experiment 4 may benefit from:

```typescript
// Optional — stored in entity.state, not a new column
state.spatial_hints?: {
  cluster?: string        // group ID for clustering
  avoid?: string[]        // zone names to avoid
  priority?: 'normal' | 'must-be-visible'
  layout_group?: string   // batch ID for coordinated animation
}
```

### New store methods (proposed)

```typescript
// Collision-aware position update (doesn't force locked: true)
updatePositionSoft: (id: string, pos: { x: number; y: number }) => void

// Batch position update with optional stagger
batchUpdatePositions: (updates: Array<{ id: string; position: EntityPosition; size?: EntitySize }>) => void
```

---

## What This Spike Does NOT Answer

- Infinite canvas (pan & zoom) — this spike assumes a fixed viewport
- Snap-to-grid or alignment guides — precision placement UX
- Multi-user collision (two users dragging entities simultaneously)
- Entity grouping semantics (folders, selections, semantic clusters) — only spatial clustering
- Performance at scale (100+ entities) — this spike targets ≤50 entities
- Agent spatial reasoning quality — whether the LLM can issue good layout intents (prompt engineering, not architecture)

---

## Spike Output (fill in after running)

- [ ] Verdict on collision detection location (middleware / module / render-time)
- [ ] Verdict on collision definition (AABB / semantic / zone-based)
- [ ] Spatial constraint declaration model chosen
- [ ] Agent batch layout tool shape decided
- [ ] Reactive rearrangement model chosen (push / pull / agent-driven)
- [ ] Animation choreography pattern for batch operations
- [ ] `resolveCollisions` function exists and passes test suite
- [ ] `computeLayout` function exists for grid/row/cluster
- [ ] Recommendation: proceed / pivot / park
- [ ] TASKS.md update if green
