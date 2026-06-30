# Spike: Collision Detection & Spatial Self-Orchestration

**Date:** 2026-02-17
**Status:** Open — not yet run
**Author:** Design discussion between user + Claude

---

## The Question

Can entities detect collisions and orchestrate their own size and position — both individually and in agent-coordinated batches — to enable complex spatial choreography on the canvas?

This is a feasibility and design spike. It produces decisions, not shippable code.

---

## Reframing: Spatial Recipes, Not a Physics Engine

The original framing focused on building a generic collision engine. Discussion revealed the real need is a **catalogue of specific spatial behaviors** — discrete choreographies, each with its own trigger, visual feel, and UX expectations. They share some primitives but the logic is different per recipe.

### The Recipes

| # | Recipe | Trigger | Who decides | Feel |
|---|---|---|---|---|
| 1 | **Generation tiling** | Agent creates N cards at once | Agent (batch) | Cards appear one-by-one, tiling into a grid/row |
| 2 | **Chat-aware parting** | Chat panel opens/closes | System (reactive) | Entities slide aside like a curtain, slide back when chat closes (reversible) |
| 3 | **Window/entity snapping** | User drags to edge/corner, or agent command | User or agent | macOS-style: left half, right half, quadrants. Snap zones are shared vocabulary between user and agent. |
| 4 | **Folder gather** | Cards grouped into folder | Agent or user action | Cards fly inward to the folder position, become child entities IN the folder (not on canvas) |
| 5 | **Folder scatter** | Folder opened/dissolved | Agent or user action | Cards burst outward from folder, settle into positions on canvas as independent entities |
| 6 | **Side-by-side windows** | User or agent tiles two windows | Either | Two windows split the viewport 50/50 (or 60/40, etc.) |
| 7 | **Viewport resize rearrangement** | Browser/viewport resizes | System (reactive) | Entities adjust to stay visible and maintain relative layout |

### Key Decisions from Discussion

- **Agent can snap too** — snap zones are a shared vocabulary between user and agent, not just a drag gesture
- **Folder is containment** — children are IN the folder, not hidden on canvas. Gather = animate + reparent as children. Scatter = reparent out + animate to canvas positions.
- **Chat parting is reversible** — entities slide apart when chat opens, slide back together when it closes (like a curtain)
- **Viewport resize triggers rearrangement** — entities must adjust, not clip off-screen

### Why This Matters

The current system places entities with a naive stacked offset (`createEntityFromApp.ts:24`) and scatters folders in a fixed 3-column grid (`entityStore.ts:231`). Entities have no awareness of each other's bounds. The architecture doc acknowledges this gap explicitly:

> **Collision detection:** The frontend layout engine handles collision avoidance when placing new entities. [...] Post-v1: consider giving the agent pixel-level position control for precise spatial arrangements.
> — `docs/ARCHITECTURE.md:126`

The user scenarios already assume this capability exists:

- *"Five cards appear on the canvas in a tiled row"* — `SCENARIOS.md:162`
- *"Ten cards appear on the canvas at once, tiled in a grid"* — `SCENARIOS.md:353`
- *"The entities begin moving — spring animations as they rearrange"* — `SCENARIOS.md:982`

Without spatial recipes, these scenarios are unrealizable. Entities stack on top of each other, generation states pile up at center, and opening agent chat hides whatever is behind it.

---

## Architecture Direction: Recipe-Driven, Not Engine-Driven

Instead of a monolithic collision engine that tries to handle everything, the approach is:

### Shared Primitives (small, tested, reusable)
Low-level building blocks every recipe composes:
- `getEntityRects(entities)` — extract bounding boxes from store
- `getFixedZones(uiState)` — chat panel rect, dock rect, header rect
- `findOverlaps(rects, zones)` — which entities overlap each other or zones
- `nudge(rect, awayFrom, viewport)` — push one rect away from another, clamped to viewport
- AABB (axis-aligned bounding box) overlap detection for entity-vs-entity
- Fixed zone rects (chat panel, dock, header) for UI-aware avoidance
- Spring animation configs per choreography feel

### Per-Recipe Functions
Each recipe is its own function composing those primitives:
- `tileNewCards(newIds, existingRects, viewport)` → positions
- `partForChat(entityRects, chatRect, viewport)` → positions (+ inverse: `unpartForChat`)
- `snapToZone(entityId, zone, viewport)` → position + size
- `gatherIntoFolder(childIds, folderPosition)` → animation targets
- `scatterFromFolder(childIds, folderPosition, viewport)` → positions
- `tileSideBySide(entityIds, viewport, split?)` → positions + sizes
- `adjustForViewportResize(entityRects, oldViewport, newViewport)` → positions

Each is independently testable, has its own visual character, and doesn't need to know about the others. A generic resolver that tries to handle all of them will either be too simple to produce good choreography or too complex to reason about.

---

## Open Questions

### 1. Where does spatial logic run?

**Leaning toward: Option B — separate layout module.** Reasons from discussion:

- Middleware (Option A) is tempting but the asymmetry is real: user drags must bypass collision detection, agent placements must go through it. A middleware that sometimes doesn't run is just a function with extra steps.
- Render-time resolution (Option C) is a trap — the store not reflecting reality will cause sync bugs with Supabase CDC. Positions in the store would diverge from what the user sees.
- A pure module called explicitly gives you control over when each recipe runs without coupling spatial logic to the store's write path.

**Still open:** Should there be one module with all recipes, or a `core/spatial/` directory with one file per recipe?

### 2. What is a "collision"?

**Leaning toward: AABB first, semantic zones layered on top.**

- Pure AABB for entity-vs-entity overlap — simple, correct, cheap.
- Fixed zone rects (chat panel, dock, header) for UI-aware avoidance — these are semantic but represented as rects, so they use the same AABB math.
- Each recipe defines what "collision" means in its context. Generation tiling cares about entity-entity overlap. Chat parting only cares about chat-panel-entity overlap. Snap zones don't care about collision at all — they're about intent.

### 3. How do entities declare spatial preferences?

Still open. Three options unchanged from original doc:

**Option A — Static constraints on the app type:**
Each `BuiltInApp` declares spatial metadata alongside `defaultSize` and `defaultPresentation`:

```typescript
spatial: {
  minSize: { width: 232, height: 300 },
  maxSize: { width: 800, height: 600 },
  anchor?: 'center' | 'top-left' | 'near-parent',
  avoidZones?: ('chat-panel' | 'dock' | 'header')[],
  groupAffinity?: string,
}
```

Simple, predictable, declared once per app type. But can't adapt to runtime state.

**Option B — Computed constraints from entity state:**
A function `getSpatialConstraints(entity) → Constraints` that reads entity state. A generating image might return `{ priority: 'must-be-visible', preferredLayout: 'tile-with-siblings' }` while a completed image returns `{ priority: 'normal' }`.

More expressive. But couples the layout engine to app-specific logic.

**Option C — Constraint field on Entity:**
Add `spatial_hints` to `Entity.state`. The agent or app reducer writes hints. The layout engine reads them generically.

```typescript
entity.state.spatial_hints = {
  avoid: ['chat-panel'],
  cluster: 'research-batch-abc',
  priority: 'must-be-visible',
}
```

*Key tension:* Option A is rigid. Option B couples layout to app internals. Option C is flexible but relies on whoever writes the hints to get them right.

*New thought from recipe framing:* Most recipes don't need entity-level spatial preferences at all. Generation tiling is driven by the batch of new entities. Chat parting is driven by the chat zone. Snap zones are driven by user/agent intent. Folder gather/scatter is driven by the folder. The recipes themselves encode the spatial logic — entities might not need to declare much beyond their current `size` and `position`.

### 4. How does the agent issue batched layout commands?

**A — Explicit coordinates:** Agent computes every coordinate. Error-prone, token-expensive.

**B — Layout intent:** Agent declares what arrangement it wants (grid, row, snap-left, etc.). Frontend computes positions. Agent doesn't need viewport math.

**C — Hybrid:** Agent can use either. Layout intents expand to coordinates inside the layout engine.

*Key tension:* Option A gives max control but the agent would need viewport size, entity sizes, and layout math. Option B is declarative and clean but limits the agent to pre-defined layouts. Option C is flexible but complex.

*New thought from recipe framing:* The recipes ARE the layout intents. "Tile these cards" = `tileNewCards`. "Snap this window left" = `snapToZone('left')`. The agent tool could reference recipes by name rather than inventing a generic layout DSL.

### 5. Reactive rearrangement — push model or pull model?

**Push (event-driven):** State changes emit events (`chat-opened`, `viewport-resized`). A spatial controller subscribes and runs the relevant recipe. Entities animate to new positions.

**Pull (continuous):** Zustand `subscribe` re-runs collision detection on any state change. Debounced.

**Explicit (agent-driven):** Agent issues rearrangement commands for every spatial change.

**Decision from discussion: Push for system-triggered recipes.** Chat parting and viewport resize are event-driven — they have clear triggers. The agent doesn't need to be in the loop for these. Agent-driven recipes (generation tiling, snap, folder operations) are already explicit.

**Decision from discussion: Chat parting is reversible.** Entities slide apart when chat opens, slide back when it closes. Like a curtain, not a permanent displacement.

### 6. Animation choreography for batch operations

**Staggered spring:** All entities start in the same frame with increasing delay (e.g., 30ms stagger). Uses `SPRING.agent` physics. Ripple effect.

**Grouped spring:** Single spring controls "progress" of the entire layout change. Entities interpolate along paths. Feels like the layout breathes.

**Priority-ordered:** Most important entity (e.g., newly created) moves first. Surrounding entities adjust after.

*Key question:* Should the agent control choreography style, or should each recipe have a fixed feel? Leaning toward: **each recipe owns its choreography.** Generation tiling = staggered appearance. Chat parting = grouped curtain. Folder gather = priority-ordered convergence. Folder scatter = staggered burst. This matches the recipe-driven approach — choreography is part of the recipe, not a generic parameter.

### 7. Snap zones — what are they?

New question from discussion. macOS-style snap zones need definition:

**Option A — Edge zones:** Drag to left/right edge = 50% split. Drag to corner = quadrant. Simple, well-understood.

**Option B — Named zones:** Define a vocabulary of zones (`left-half`, `right-half`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`, `full`). Both user drag and agent commands reference the same names.

**Option C — Flexible splits:** Allow arbitrary splits like 60/40, 70/30. More complex but more useful for asymmetric layouts.

*Key question:* Since both user and agent share the snap zone vocabulary, the zone names become part of the agent's tool schema. How many zones is enough without being confusing?

### 8. Folder containment model

New question from discussion. The current `scatterFolder` treats children as entities that are always on the canvas (just repositioned). The desired model is different:

**When cards are IN a folder:**
- They are child entities of the folder (listed in `folder.state.child_ids`)
- They are NOT on the canvas — `presentation` should be `'hidden'`? Or a new state?
- The folder entity itself is visible as a stack

**Gather animation:** Cards fly inward to the folder position → on arrival, they disappear from canvas and become children of the folder entity.

**Scatter animation:** Children are removed from folder, placed on canvas at folder position → animate outward to computed positions.

*Key question:* What's the entity state for "in a folder"? Options:
- `presentation: 'hidden'` + parent knows `child_ids` (current pattern for hidden entities, but "hidden" means something else — facts, conversation turns)
- `presentation: 'folded'` (new presentation type — explicitly means "inside a folder")
- `state.parent_folder_id` field on the child entity (child knows its parent)

---

## The Spike: Per-Recipe Experiments

Each experiment probes one recipe. They can be run independently — no strict ordering required.

---

### Experiment 1 — Generation tiling

**Goal:** When the agent creates N cards at once, they tile into a grid/row that adapts to what's already on the canvas.

**What to answer:**
- Can `buildPendingEntity` (in `consumeAgentStream.ts:46`) be replaced with a proper tiling function that accounts for existing entities?
- Does the current 5-column center-anchored grid in `buildPendingEntity` need to become viewport-aware and collision-aware?
- Should tiling be computed at `tool_call_start` (pending phase) or `tool_call_result` (final phase)?
- What happens when the agent creates 15 cards? 30? When does the grid need to scroll or wrap?

**Done when:** We have a clear answer on where tiling is computed, what inputs it needs, and whether AABB + viewport clamping is sufficient or if we need something smarter.

---

### Experiment 2 — Chat-aware parting (reversible)

**Goal:** When the conversation panel opens, entities slide aside. When it closes, they slide back.

**Current state:** The conversation panel is a `fixed` 400px-wide, up to 60vh-tall element anchored at bottom-center (`AgentChat.tsx:98`, `ConversationPanel.tsx:66`). It floats over the canvas with `z-50`. Entities behind it are simply occluded — no spatial awareness.

**What to answer:**
- What's the chat panel's footprint as a rect? It's `fixed` positioned, not inside the canvas flow. Need to compute its bounding box relative to the canvas coordinate system.
- "Reversible" means storing pre-parting positions. Where? Options: (a) a `_prePartPositions` map in the spatial module, (b) `entity.state._savedPosition`, (c) derive from current positions + inverse of the parting vector.
- Should only overlapping entities move, or should ALL entities redistribute to make room?
- Does the PromptInput (always visible) count as a fixed zone too, or just the conversation panel?

**Done when:** We have a clear model for: what triggers parting, what the zone rect is, how positions are saved/restored, and how the animation works.

---

### Experiment 3 — Snap zones (macOS-style)

**Goal:** User drags a window to an edge/corner and it snaps to fill that zone. Agent can also snap by name.

**What to answer:**
- What zones do we support? Minimum: `left-half`, `right-half`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `full`. Should `center` be a zone?
- How does the user trigger a snap? Options: (a) drag to viewport edge + hold, (b) drag to a visual drop zone that appears, (c) keyboard shortcut.
- How does the agent trigger a snap? A tool like `snap_entity({ entity_id, zone: 'left-half' })` or extending `arrange_entities`?
- Does snapping change entity size (stretch to fill zone) or just position? macOS changes both.
- What happens to the entity's original size when it unsnaps? Need to store pre-snap size.
- Do snap zones account for the dock and header? (i.e., "left-half" means left half of the USABLE canvas, not the full viewport)

**Done when:** We have the zone vocabulary defined, snap/unsnap behavior specified, and a decision on how both user and agent trigger it.

---

### Experiment 4 — Folder gather & scatter

**Goal:** Cards animate into a folder (gather) or out of a folder (scatter) with the folder as containment, not just visual grouping.

**Current state:** `scatterFolder` (`entityStore.ts:221`) already does scatter: places children in a 3-column grid starting at folder position, then archives the folder. But it treats children as always being on the canvas (just repositioned).

**What to answer:**
- **Containment model:** What's the entity state for "inside a folder"? Options:
  - `presentation: 'hidden'` — reuses existing value but conflates "in folder" with "invisible fact"
  - `presentation: 'folded'` — new presentation type, semantically clear
  - Keep `presentation: 'card'` but add `state.parent_folder_id` — entity knows its parent
- **Gather animation:** Cards fly toward folder position → on arrival, set presentation to hidden/folded, add to `folder.state.child_ids`. Is this a two-phase operation (animate then mutate) or a single batch mutation with animation handled by Framer Motion's `AnimatePresence exit`?
- **Scatter animation:** Currently instant (positions computed, set in one store mutation). How to make it animated? The `motion.div` in `SpaceRenderer.tsx:109` handles `initial` animation — new entities animate in. But scattered entities already exist in the store. Need to animate position change, not appearance.
- **Folder display:** When entities are "in" a folder, what does the folder look like? Current `FolderStack` renders a stack visual. Does it show previews? Count?

**Done when:** Containment model is decided. Gather and scatter animation approach is clear. We know what store mutations are needed.

---

### Experiment 5 — Side-by-side windows

**Goal:** Two windows tile to fill the viewport (or usable area) side by side.

**What to answer:**
- Is this a special case of snap zones? (left-half + right-half) Or a distinct recipe?
- Can the split ratio be adjusted? (50/50 default, draggable divider?)
- What happens to other entities when two windows go side-by-side? Are they pushed aside? Hidden? Unchanged (just behind)?
- Is this user-triggered only, or can the agent do it? ("Compare these two documents side by side")

**Done when:** We know if this is a snap-zone variant or its own thing, and what happens to the rest of the canvas.

---

### Experiment 6 — Viewport resize rearrangement

**Goal:** When the browser/viewport resizes, entities adjust to stay visible and maintain relative layout.

**What to answer:**
- Should positions scale proportionally? (Entity at 50% stays at 50%) This is what `locked: false` (percentage coords) already does — but `updatePosition` forces `locked: true` (pixel coords).
- What about entities that were manually dragged (pixel-positioned)? Scale them proportionally, or clamp them to viewport bounds?
- Should snapped entities re-snap to the new zone dimensions?
- Is this just `clampToViewport` on all entities, or something smarter?
- Performance: how often does resize fire, and can we debounce the rearrangement?

**Done when:** We have a clear strategy for what happens to percentage-positioned vs pixel-positioned entities on resize.

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
| `core/agent-chat/AgentChat.tsx` | Sends `canvasViewport` to agent — the agent already knows viewport dimensions. |

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
- Alignment guides / snap-to-grid — precision placement UX (orthogonal to recipes)
- Multi-user collision (two users dragging entities simultaneously)
- Performance at scale (100+ entities) — this spike targets ≤50 entities
- Agent spatial reasoning quality — whether the LLM can issue good layout intents (prompt engineering, not architecture)
- Drag-and-drop reordering within a folder
- Entity minimize/maximize (distinct from snap — more like macOS window shade)

---

## Spike Output (fill in after running)

### Architectural decisions
- [ ] Spatial logic location: separate module (confirmed or revised)
- [ ] Collision definition: AABB + zones (confirmed or revised)
- [ ] Spatial preferences model chosen (static / computed / hints / not needed)
- [ ] Agent tool shape for spatial commands decided
- [ ] Folder containment model decided (presentation value + state shape)

### Per-recipe verdicts
- [ ] Generation tiling — feasible / needs design / blocked by ___
- [ ] Chat-aware parting — feasible / needs design / blocked by ___
- [ ] Snap zones — feasible / needs design / blocked by ___
- [ ] Folder gather/scatter — feasible / needs design / blocked by ___
- [ ] Side-by-side windows — is it a snap-zone variant or its own thing?
- [ ] Viewport resize — proportional scaling vs clamping vs hybrid

### Outcome
- [ ] Recommendation: proceed / pivot / park
- [ ] TASKS.md update if green — one task per recipe, or grouped?
