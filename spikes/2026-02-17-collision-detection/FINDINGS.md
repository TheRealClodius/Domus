# Spike: Spatial Recipes — Findings

## Phase 1: Can primitives compose into recipes? ✅ Yes

`rectsOverlap`, `findZoneOverlaps`, `nudge`, `clampToViewport` compose cleanly.
Two structurally different recipes (agent-driven tiling, system-driven parting) use
the same building blocks without a shared engine. ~200 lines total across 3 files.

## Phase 2: Browser testing — what broke

### Animation ✅ Solved

**Problem:** SpaceRenderer sets position via CSS `left`/`top` in `style`. Framer Motion
doesn't animate `style` — only `animate` prop values. Position changes teleport.

**Fix:** Move `left`/`top` from `style` into `animate`. Use per-property transitions
so entrance (opacity + scale → `SPRING.popIn`) and repositioning (left + top → `SPRING.agent`)
have different spring physics. Motion v12 supports this natively:

```tsx
initial={{ opacity: 0, scale: 0.98, y: 8, left: X, top: Y }}
animate={{ opacity: 1, scale: 1, y: 0, left: X, top: Y }}
transition={{
  opacity: SPRING.popIn,
  scale: SPRING.popIn,
  y: SPRING.popIn,
  left: SPRING.agent,
  top: SPRING.agent,
}}
style={{ position: 'absolute', zIndex: Z }}
```

`initial` includes `left`/`top` to prevent entities sliding from (0,0) on first render.

### Drag snap-back ✅ Solved

**Problem:** Drag uses `translate3d` for 60fps, then clears transform and commits to store.
With animated `left`/`top`, Framer Motion sees old-position → new-position and animates
the transition — entity visually snaps back to old position then slides to new.

**Fix:** `markJustDragged(entityId)` sets a module-level flag. `getEntityTransition()`
returns `{ left: { duration: 0 }, top: { duration: 0 } }` for just-dragged entities,
skipping position animation. Flag auto-clears after one `requestAnimationFrame`.

User drags: instant position commit. Recipe moves: spring-animated. Clean separation.

### Chat parting v1 — individual nudge ❌ Failed

Two problems observed in browser testing:

**A. Nudge doesn't guarantee escape.**
`nudge()` pushes along the axis of least overlap. If the chat panel is taller than the
space above the entity, the entity gets pushed upward, `clampToViewport` pushes it back
down, and it's still behind the chat panel. The function doesn't try alternative directions.

**B. Individual nudging destroys group topology.**
Two cards slightly overlapping with an x-axis fan get nudged independently. Both receive
similar vertical displacement → they collapse into perfect y-alignment. The fan, the slight
overlap, the visual relationship between them — all lost.

### Chat parting v2 — cluster-based translation ✅ Solved

**Key insight: group topology.** Entities near each other have spatial relationships (fan,
overlap, stacking) that are part of the visual design. Individual nudging destroys these.
Cluster-based translation preserves them by applying a shared displacement vector.

**Algorithm:**
1. Find all entities overlapping the chat zone
2. Split into left/right clusters (relative to chat center-x)
3. For each cluster, compute bounding box of the group
4. Try all 4 escape directions, pick shortest that clears AND fits viewport
5. Apply same `(dx, dy)` to every entity in the cluster

**Result:** Fan angle preserved, overlap preserved, stacking preserved. Verified in browser.

### Chat parting v2.1 — real DOM measurement ✅ Improved

**Problem:** Hardcoded chat rect dimensions didn't match actual chat panel, leading to
incorrect escape vectors and entities not clearing the real panel.

**Fix:** Measure the actual chat element via `getBoundingClientRect()` at parting time.
Convert from viewport coordinates to canvas coordinates (subtract canvas offset for
header/sidebar). Log measured rect to console for debugging.

**Key detail:** The chat element is `fixed bottom-10 left-1/2 -translate-x-1/2 z-50`.
It contains ConversationPanel (400px wide, up to 60vh) stacked above PromptInput (350px
wide, ~51px). The bounding rect of the wrapper captures the full footprint including both.

**Selector used:** `document.querySelector('[class*="z-50"][class*="fixed"]')` — brittle
for production, but sufficient for the spike. Production version should use a `data-testid`
or ref forwarded from AgentChat.

## Architecture Verdict (updated after Phase 2)

**Recipe-driven architecture: confirmed viable.** All issues found were about algorithm
quality *within* a recipe, not about the recipe architecture itself. The composability
pattern held up through three iterations of the parting algorithm.

### Where spatial logic lives
`core/spatial/` directory:
- `primitives.ts` — AABB overlap, clamp, nudge, entityToRect
- One file per recipe — each is a pure function: inputs → position outputs
- No index file, no shared state, no event bus

### Who calls recipes
- **Generation tiling:** called by `consumeAgentStream` when agent creates N entities
- **Chat parting:** called by `useEffect` or Zustand `subscribe` watching chat open/close
- **Snap zones (future):** called by drag handler or agent tool
- Each caller knows when to invoke its recipe — no central dispatcher

### Critical pattern: measuring UI zones from DOM
Recipes that react to UI elements (chat panel, dock, header) need real bounding rects,
not hardcoded dimensions. The pattern is:
1. Query the DOM element at recipe trigger time
2. `getBoundingClientRect()` for viewport coords
3. Subtract canvas element offset to get canvas-space coords

This should be extracted into a shared `getZoneRect(selector, canvasEl)` primitive
for production. Each UI zone should have a `data-spatial-zone` attribute.

### Primitives that proved useful
- `rectsOverlap(a, b)` — core AABB test, used everywhere
- `findZoneOverlaps(rects, zone)` — "which entities overlap this UI element?"
- `clampToViewport(rect, viewport)` — hard boundary enforcement
- `entityToRect(entity)` — bridge from Entity type to spatial Rect

### Primitives added during spike
- `boundingBox(rects)` — union bbox of a rect set (for cluster translation)
- `findEscapeVector(clusterBBox, obstacle, viewport)` — try all 4 directions, return shortest valid

### Primitives still needed for production
- `getZoneRect(selector, canvasEl)` — DOM measurement → canvas-space rect
- `translateCluster(rects, vector)` — apply shared (dx, dy) to a set of rects

## Lessons learned

1. **Animate position via Framer Motion `animate` prop, not CSS `style`.** Per-property
   transitions let entrance and repositioning use different springs cleanly.

2. **User-initiated position changes must bypass animation (THE SNAP-BACK BUG).**
   This is a recurring pattern that will bite every time visual position diverges from
   store position.

   **Root cause:** Drag uses `translate3d` for 60fps performance. On release, the transform
   is cleared and the store updates with the new position. Framer Motion sees the CSS
   `left`/`top` jump from old-position to new-position and animates the transition. The
   entity visually snaps back to old-position then slides to new-position.

   **Fix:** Mark the entity as "skip animation" BEFORE updating the store position.
   `markJustDragged(id)` adds to a Set, `getEntityTransition()` returns `duration: 0`
   for marked entities. The mark is cleared after React renders with the new position.

   **Critical timing detail:** Do NOT use `requestAnimationFrame` to clear the mark.
   React 19 batches and defers renders — a single rAF can fire before React re-renders,
   clearing the flag too early. Use `setTimeout(0)` instead — it runs after React's
   synchronous render triggered by the Zustand `set()` that follows.

   **This pattern recurs in:**
   - User drag (translate3d → store commit)
   - Resize drag (same mechanism)
   - Any direct DOM manipulation that desyncs visual position from Framer Motion state
   - Future: snap zones, any gesture that uses direct DOM for performance

   **The fix is always the same:** mark → update store → React renders with `duration: 0`
   → clear mark → next recipe-driven move animates normally.

3. **Group topology matters more than individual placement.** The jump from v1 (per-entity
   nudge) to v2 (cluster translation) was the biggest quality improvement. Any recipe that
   moves multiple entities should think in clusters, not individuals.

   **Nuance: topology is relative, not absolute.** Cluster translation preserves relative
   positions exactly, but that's too rigid. When parting pushes more entities into the same
   area, the cluster may need to *compress* — tighten the fan, reduce gaps between cards —
   to fit without going off-viewport. The invariant is: relative relationships are preserved
   but can be *scaled*. Two cards fanned at 30px offset might compress to 20px offset, but
   they never collapse to 0px or swap order. Think of it as scaling the cluster's internal
   coordinate space, not translating each entity independently.

   This means the production algorithm needs a **cluster scale factor** alongside the
   translation vector: `(dx, dy, scale)` where `scale ∈ (0.5, 1.0]`. Positions are
   computed as: `newPos = clusterCenter + (originalOffset * scale) + (dx, dy)`.
   Scale < 1.0 tightens the cluster. Scale = 1.0 preserves exactly.

4. **Measure, don't assume.** Hardcoded dimensions for UI elements diverge from reality
   fast. DOM measurement at recipe trigger time is cheap and correct.

5. **Escape vector validation is essential.** The v1 nudge didn't verify the result was
   actually clear of the obstacle. v2's `findEscapeVector` tries all directions and only
   picks ones that fully clear + fit viewport.

## Open questions remaining
- Tiling: not yet browser-tested with obstacles (only smoke-tested in Node)
- Performance: untested beyond 6 entities
- `consumeAgentStream` batching: currently creates entities one-by-one, tiling needs a batch
- Drag-during-recipe: what if a recipe animates an entity the user is mid-drag on?
- Cluster splitting: current left/right split by chat center-x is simple but might not
  handle entities directly above or below the chat panel well (they'd join whichever side
  their center-x falls on)

## Phase 3: Window resize as spatial tool

### Insight: entities are not all rigid

Cards are fixed-size (232x300). Windows are elastic (min 300x200, no max). The parting
recipe should exploit this — windows can resize as part of the escape, not just translate.

### Hierarchy of spatial operations

1. **Escape (translate)** — move clusters clear of the chat zone. Priority 1. Non-negotiable.
2. **Escape (resize)** — if translation alone puts a window against the viewport edge
   or the escape distance is excessive, shrink the window to make the escape work.
   This is still escape — resize is a tool for fitting, not a separate concern.
3. **Readability (resize)** — after escape is complete, if a window with dense content
   has room to spare in its cluster, grow it. This is a secondary optimization that
   only applies to windows, and only when space permits.

Steps 1 and 2 are the same concern (clearing the chat zone) using different tools.
Step 3 is a separate pass.

### Algorithm update

The parting recipe becomes a two-pass algorithm:

**Pass 1: Escape (translate + shrink-to-fit)**
```
For each cluster:
  1. Compute escape vector with current sizes
  2. If escape would push cluster partially off-viewport:
     a. Find windows in the cluster
     b. Compute how much shrink is needed to fit (on the escape axis)
     c. Shrink windows proportionally (respecting min 300x200)
     d. Recompute cluster bbox → shorter escape vector
  3. Apply translation to all entities
  4. Apply resize to shrunk windows
```

**Pass 2: Readability (grow-to-fill)**
```
For each cluster:
  1. Measure available space between cluster boundary and viewport edge
  2. For each window in the cluster:
     a. If window has dense content (heuristic: scroll overflow, many child elements)
        AND available space > some threshold
     b. Grow window to fill available space on the escape axis
```

### What needs saving for restoration
- Original positions (already saved)
- Original sizes (new — save for any window that was resized)
- Both restored on unpart

### Presentation-aware spatial behavior
This is the first case where the recipe needs to know `entity.presentation`:
- `'card'`: rigid, translate only
- `'window'`: elastic, translate + resize
- `'folder'`: rigid (like card), translate only

This suggests `entityToRect` should carry a `resizable: boolean` flag, or the recipe
should receive presentation type alongside the rect. The primitive doesn't need to know
about presentations — the recipe does.

### Open question: readability heuristic
How does the recipe know a window has "dense content"? Options:
- **Always grow** if space permits (simple, might over-grow empty windows)
- **Content signal in entity state** — app reducer sets `state.contentDensity` or similar
- **DOM measurement** — check if the window's scroll container has overflow
- **App type heuristic** — calendar and chat windows are always dense, notes depend on content

For the spike, "always grow if space permits" is sufficient. Production can refine.

## Phase 4: Viewport Perimeter Inset

### Problem
Browser testing revealed parted entities (especially resized windows) end up flush against
the viewport edge, defeating the readability goal. A 16px inset gives breathing room.

### The naive approach broke escape direction selection

**What happened:** Adding `VIEWPORT_INSET = 16` to every boundary check — `escapeWouldFit`,
`computeFitScale`, `applyClusterTransform` post-clamp, `computeReadabilityGrow` — caused
all entities to move UP instead of LEFT/RIGHT during parting.

**Root cause:** `escapeWouldFit` became too strict. For wide clusters (entities spread
horizontally), the pure LEFT/RIGHT escape would place the cluster's edge at x=6 — valid
at the old boundary (x >= 0) but rejected by the inset boundary (x >= 16). With no pure
escape fitting, the algorithm fell through to the scale path, which picks the SHORTEST
escape vector. For wide, shallow clusters, the shortest escape is UP, not LEFT/RIGHT.
Moving everything up doesn't clear the chat zone.

**Fix: separate planning from enforcement.**

| Location | Uses inset? | Why |
|---|---|---|
| `clampToViewport` (primitives) | **Yes** | Final position enforcement — the single source of truth |
| `escapeWouldFit` | **No** | Escape direction planning needs full viewport to pick correct axis |
| `computeFitScale` | **No** | Scale computation needs full viewport to avoid over-compression |
| `applyClusterTransform` post-clamp | **Yes** | Group shift preserves relative positions while respecting inset |
| `computeReadabilityGrow` | **Yes** | Growth shouldn't extend into the inset zone |
| `tileNewEntities` grid centering | **Yes** | Grid starts 16px from edge |

The escape algorithm plans with the full viewport (maximizing its ability to find good
escape paths), then the execution layer (`clampToViewport` + post-clamp) nudges everything
16px inward. Escape direction selection is unchanged from pre-inset behavior, but final
positions respect the 16px boundary.

**Lesson: viewport insets are an execution concern, not a planning concern.** The planning
layer (escape vectors, scale factors) should work with maximum available space. The
enforcement layer (clamping, group shifting) applies visual polish constraints. Mixing the
two corrupts the planning heuristics.

### Recipe-driven resize triggers the snap-back bug (again)

**Problem:** When the parting recipe resizes a window (shrink-to-fit in Pass 1 or
grow-to-fill in Pass 2), the size change is instant while position animates via spring.
The window snaps to its new dimensions while sliding to its new position — visually jarring.

**Root cause:** Same pattern as the drag snap-back (lesson 2 above), but for size instead
of position. Window's `width`/`height` were set via CSS `style` (instant), while
`left`/`top` were in Framer Motion's `animate` prop (spring-animated). Recipe-driven
changes should animate both position AND size in sync.

**Fix:** Move `width`/`height` into the `motion.div` wrapper's `animate` prop alongside
`left`/`top`. Add `SPRING.agent` transitions for width/height in `getEntityTransition`.
Window component uses `width: 100%; height: 100%` to fill its animated parent. For
user-drag resize, `markJustDragged` already sets `duration: 0` — extended to cover
width/height too.

**Updated pattern for any animated entity property:**
1. The property MUST be in Framer Motion's `animate` prop (not CSS `style`)
2. `getEntityTransition` controls per-property spring config
3. Recipe-driven changes: `SPRING.agent` (smooth)
4. User-initiated changes: `duration: 0` via `markJustDragged` (instant, no snap-back)
5. This applies to: left, top, width, height — and any future animated property

### Per-window shrink-to-clear replaces heuristic shrink

**Problem:** The original `scale < 0.85` heuristic shrank all windows proportionally when
the cluster was heavily compressed. But a window wider than the escape corridor didn't get
shrunk at all unless compression was severe — it ended up partially behind the chat.

**Fix:** After translating a cluster, check each individual resizable entity for overlap
with the padded chat rect using `rectsOverlap`. If it overlaps, shrink on the **escape
axis** to exactly clear the obstacle edge. This replaces the heuristic with a precise
per-window check.

### Readability grow must be perpendicular to escape axis

**Problem:** The readability grow pass expanded windows on the escape axis. If escape was
LEFT, grow increased width — pushing the window's right edge back into the chat zone.

**Fix:** Grow on the **perpendicular** axis. Escape horizontal → grow height. Escape
vertical → grow width. Windows become taller+narrower (or wider+shorter) to recover visual
area without re-entering the chat zone. Each window is evaluated individually for spare
space, with a preference for growing downward/rightward for visual stability.

### Group clamp needs a per-entity safety net

**Problem:** The `applyClusterTransform` post-clamp uses `if...else if` per axis. If a
cluster overflows both top AND bottom (cluster taller than viewport minus insets), only the
top gets fixed. The bottom entity ends up flush against the viewport edge.

**Fix:** Add a final per-entity `clampToViewport` in `partForChat` after both passes. This
catches overflow on the opposite edge. The 16px adjustment is small enough that cluster
topology is negligibly affected. This is a safety net — the group clamp handles the common
case, the per-entity clamp handles the overflow edge case.

## Phase 5: Escape reliability fixes (2026-02-18)

Three bugs surfaced from browser testing edge cases. All share a root cause:
**subsystems disagreeing on viewport bounds**.

### Bug 1: `escapeWouldFit` vs `applyClusterTransform` bounds disagreement

**Problem:** `escapeWouldFit` checked `x >= 0` (full viewport) but
`applyClusterTransform` group clamp enforced `VIEWPORT_INSET`. Escape approved
positions that group clamp pushed back into the chat zone.

**This contradicts the Phase 4 lesson** ("viewport insets are an execution concern,
not a planning concern"). Phase 4 was correct for *scale computation* — planning
with full viewport avoids over-compression. But for *escape fit validation*, the
planner must match the enforcer's bounds, otherwise it approves escapes that the
enforcer invalidates.

**Fix:** `escapeWouldFit` now checks against `VIEWPORT_INSET`:
```typescript
return shifted.x >= VIEWPORT_INSET
    && shifted.y >= VIEWPORT_INSET
    && shifted.x + shifted.width <= viewport.width - VIEWPORT_INSET
    && shifted.y + shifted.height <= viewport.height - VIEWPORT_INSET
```

**Refined lesson:** Separate planning from enforcement for *continuous values*
(scale factors, growth amounts) where the enforcement layer can polish the result.
But for *binary decisions* (does this escape fit? yes/no), planner and enforcer
MUST agree on bounds — otherwise the planner approves and the enforcer rejects,
with no recovery path.

### Bug 2: Single-entity cluster stretched to fill viewport

**Problem:** A lone window behind the chat escapes vertically, shrink-to-clear
reduces its height, then `optimizeClusterLayout` (readability pass) grows its
*width* to fill the entire viewport. Result: ~1500px wide × ~200px tall malformed
window.

**Root cause:** `optimizeClusterLayout` distributes surplus viewport space to
windows. With one window, all surplus goes to it. The perpendicular-axis growth
(width, since escape was vertical) has the entire viewport width minus insets as
surplus.

**Fix:** Early return in `optimizeClusterLayout`:
```typescript
if (clusterEntries.length <= 1) return
```

Single entities don't need reflowing — the readability pass is about optimizing
multi-entity cluster layout. A lone entity's size should only change via
shrink-to-clear (escape pass), not readability growth.

### Bug 3: Non-resizable entities stuck on chat

**Problem:** Cards and images (non-resizable) overlapped the chat after parting.
Sequence: (1) escape vector pushes entity toward viewport edge, (2) `escapeWouldFit`
approves, (3) group clamp pushes entity back into chat zone, (4) shrink-to-clear
skips it (`!rect.resizable`), (5) final safety clamp is chat-unaware.

**Root cause:** shrink-to-clear was the *only* post-escape remedy, and it's gated
on `resizable`. Non-resizable entities had no fallback.

**Fix:** Two changes to the final safety section:
1. Added `nudgeClearOfChat(rect, obstacle)` — pushes a rect clear of an obstacle
   along the axis of least overlap, without viewport clamping.
2. Replaced the blind `clampToViewport` final pass with a chat-aware version:
   - If entity still overlaps chat after escape, nudge it clear
   - Try viewport clamp
   - If viewport clamp re-creates chat overlap, keep the chat-clear position
     (allow viewport inset violation — **chat clearance > viewport inset**)

**Lesson: explicit priority ordering.** When two constraints conflict (stay clear
of chat vs stay within viewport inset), the system must explicitly choose a winner.
The old code treated both as equal, so the last one to run (viewport clamp) always
won — silently undoing the chat clearance work.

## Phase 6: Mechanical cleanup (2026-02-19)

Four refactors, no behavior changes, 37 tests green throughout. What we learned:

### O(n²) lookup hiding in a loop

`applyClusterTransform` iterated over `positions` and called
`entries.find(([eid]) => eid === id)` for each entry — O(n²) when `entries` is
already a `[string, EntityRect][]` tuple array. `new Map(entries)` before the loop
gives O(1) `.get(id)` lookups.

**Pattern to watch for:** any time you iterate a Map/array and do `.find()` on
another array inside the loop, you probably want a Map built once before the loop.
Small n hides it. It compounds when recipes run on every chat open/close.

### Near-duplicate functions are one parameter away from consolidation

`nudgeClearOfChat` in `partForChat.ts` was identical to `nudge` in `primitives.ts`
except it skipped the `clampToViewport` call. Adding `clamp = true` as a default
parameter to `nudge` replaced 13 lines of duplication with `nudge(rect, obstacle,
viewport, false)`.

**Lesson:** when you write a local function that's "like X but without Y", go
parameterize X. The duplication is invisible at creation time and diverges silently
over time — one copy gets a bugfix, the other doesn't.

### Local utilities that belong in primitives

`boundingBox(rects)` was defined locally in `partForChat.ts` but is a general
spatial primitive — it computes the union bounding box of a rect set. Same category
as `rectsOverlap`, `clampToViewport`, `findZoneOverlaps`. Moved to `primitives.ts`
with 4 tests. Any future recipe that works with clusters will need it.

**Heuristic:** if a function takes only `Rect[]` / `Rect` / `Viewport` and returns
the same, it's a primitive. If it takes `EntityRect` or knows about chat zones,
it's recipe logic.

### Lint debt compounds when hooks enforce on every edit

Pre-existing issues (`escape` shadowing the global `escape` property, unused
`viewport` parameter in `findEscapeVectors`, Biome formatting drift) blocked every
single edit via the lint hook. The cleanup session spent more time clearing lint
debt than making the planned changes.

**Lesson:** fix lint warnings the moment they appear, not "later". The hook makes
this non-negotiable — you can't edit the file at all until every issue is resolved,
even the ones you didn't introduce. Spike code is not exempt from this.

### Debug logging in spike code masks real output

`console.log(\`[spatial] Cluster scale: ...\`)` fired during every test that
triggered the scale path. Test output was cluttered with scale logs, making it
harder to spot real diagnostic output. Removed.

**Lesson:** even in spike code, debug logs should be temporary — add them, observe,
remove them. If you need persistent observability, add it as a return value or
a structured event, not a `console.log` that pollutes every consumer.

## Phase 7: Auto-parting via DOM observers (2026-02-19)

Replaced the manual debug button with automatic parting triggered by DOM events.

### Architecture: MutationObserver + ResizeObserver + snapshot

Hook: `usePartAroundObstacle(canvasRef)` in SpaceRenderer.

- **MutationObserver** on `document.body` watches for `[data-chat-obstacle]` appearing/disappearing
- **ResizeObserver** on the obstacle element tracks height changes (rAF-coalesced)
- **Snapshot-based recompute:** on first trigger, snapshot all visible entity positions/sizes.
  Every subsequent recompute rebuilds the entity map from the snapshot — no compounding errors.
- On obstacle removal: restore all entities to snapshot positions, clear snapshot.

### `data-chat-obstacle` must go on ConversationPanel, not AgentChat

**Problem:** First implementation put `data-chat-obstacle` on the AgentChat outer wrapper div.
This element is **always in the DOM** — it contains PromptInput (always visible). Result:
MutationObserver fired on page load, ResizeObserver triggered on every PromptInput size change
(IDLE→CLICKED expansion), and entities parted left/right in response to a tiny height change
that didn't warrant parting at all.

**Fix:** Move `data-chat-obstacle` to ConversationPanel's `motion.div`, which is conditionally
rendered (`panelVisible`). It mounts when conversation starts, unmounts on dismiss. ResizeObserver
correctly tracks it growing as messages fill up to `maxHeight: 60vh`.

**Lesson: the obstacle marker must be on the element that actually appears/disappears and
changes size meaningfully.** A wrapper that's always present in the DOM but contains the
target element is NOT the right choice — it triggers on unrelated size changes from sibling
elements (like PromptInput state transitions).

### Cinematic parting spring via `markParting` pattern

Same pattern as `markJustDragged` (module-level Set, checked in `getEntityTransition`), but
selects `SPRING.part` (slow, cinematic: `stiffness: 120, damping: 22, mass: 0.5`) instead
of `duration: 0`. Called before store updates in both `applyPart` and `restoreAll`.

**Convention established:** All springs use `mass: 0.5`. Added `SPRING.part` to `lib/motion.ts`.

## Phase 8: Choreographed Folder Gathering (2026-02-19)

Goal: cinematic gather — folder appears first (fanned), cards shrink toward it,
visually slot into the stack, folder closes.

### Phased store updates replace single-timeout approach

**Old:** Phase 1 moves cards → Phase 2 (500ms) creates folder + hides cards.
Folder popped in from nothing — no visual link between cards and folder.

**New:** Phase 0+1 (immediate) creates folder with `_gathering: true` flag + moves
cards to target. Phase 2 (timeout) hides cards + clears `_gathering`. The folder
exists from frame 1 — cards animate toward it.

Key: folder ID is determined upfront (before `set()`) so the phase 2 timeout closure
captures it. The `_gathering` flag in entity state tells FolderStack to use FANNED
layout, giving the "receiving" visual. When `_gathering` clears, `SPRING.gentle`
animates thumbnails from FANNED → STACKED — the "closing" effect.

### Scale animation needs `transformOrigin: 'top left'`

**Problem:** Cards scaled from `1 → GATHER_SCALE (73/232)` using Framer Motion's
default `transformOrigin: center`. As cards shrank, their visual center stayed put
but edges moved inward — the shrinking card drifted away from the folder's top-left
corner. Cards appeared to shrink into empty space rather than into the folder.

**Fix:** Set `transformOrigin: 'top left'` on gathering cards' `motion.div` style.
Now the card's top-left stays pinned at `(cx, cy)` — same as the folder's top-left.
The card shrinks downward-right, visually converging on the folder thumbnail area.

**Lesson: when animating scale toward a target position, the transform origin must
match the anchor point of the target.** Folder position = its top-left, so cards
must scale from their top-left. Default center-origin only works when both source
and target share the same center.

### Viewport coordinate vs canvas coordinate mismatch

**Problem:** `FolderCreateButton` (in AgentChat) used `getBoundingClientRect()` on
the button to compute `targetPosition` for the folder. But entity positions are
relative to the canvas div, and `CanvasShell` applies `inset: 12` (or 20 with sheet
open). The button's viewport coords were 12px off from canvas-space coords. Cards
gathered to one spot while the folder appeared 12px away.

**Fix:** Subtract the canvas element's `getBoundingClientRect()` from the button's:
```typescript
const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
const canvasRect = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 }
const x = rect.left - canvasRect.left - FOLDER_SIZE - ...
const y = rect.top - canvasRect.top + ...
```

Same fix applied to `SheetFolderContent.tsx` scatter (used `window.innerWidth` instead
of canvas dimensions).

**Lesson: any code outside the canvas that computes entity positions must convert from
viewport coords to canvas coords.** The canvas is NOT at viewport (0,0) — CanvasShell's
`inset` property offsets it. This is the same pattern as Phase 2's DOM measurement
insight, but for outbound (computing positions) rather than inbound (reading positions).

### `markGathering` must persist through the full animation

**Old:** `markGathering` cleared after `setTimeout(0)` — same as drag mark pattern.
But gathering animation runs for hundreds of milliseconds (spring travel + scale-down).
The mark cleared before the animation visually started, so `getEntityTransition`
returned the default spring instead of `SPRING.folder`, and the `animate` prop's
`scale` snapped back to 1 (no gathering scale was applied).

**Fix:** `markGathering` timeout matches the animation duration + small buffer. Currently
2600ms (debugging speed). Production: ~50ms past the phase 2 timeout.

Also: `gatheringIds.clear()` at start of `markGathering` to prevent stale IDs from
a previous gather leaking into the current one.

### `SPRING.folder` must drive scale too

`getEntityTransition` originally used `SPRING.popIn` for `scale` during gathering.
Position animated with `SPRING.folder` (slow) while scale used `SPRING.popIn` (fast).
Cards shrank instantly then slowly drifted to position — the reverse of the desired
effect. Fix: `scale: SPRING.folder` so scale and position animate in sync.

### Gathering exit animation should be minimal

Non-gathering cards exit with `{ opacity: 0, scale: 0.98, y: 8 }` — a subtle
float-away. Gathering cards are already at thumbnail scale (0.315) when they exit.
The `scale: 0.98` multiplier would scale to `0.315 * 0.98` — barely visible and
the `y: 8` shift would be noticeable at small scale. Fix: gathering exit is just
`{ opacity: 0 }`.

### Current state (WIP)
- Spring deliberately slow (`stiffness: 10, damping: 8, mass: 0.5`, ~2.9s) for
  visual debugging. Tests broken on timers.
- Animation mechanically works but needs further visual refinement.
- Next: tune spring speed, verify visual alignment, handle edge cases.

## Phase 9: Bottom-Center Rotation Anchors & Anchor-Aligned Gathering (2026-02-19)

### Design

**Folder states:**
- **COLLAPSED**: All cards stacked at 0deg rotation. Single rectangle visible. Used only for entrance (COLLAPSED→IDLE) and scatter exit (IDLE→COLLAPSED + slide down).
- **IDLE** (resting): Card A = -20deg, Card B = 0deg, Card C = +20deg. Rotation anchor at center-x, 4px from bottom edge.
- **FANNED** (hover/approaching/spraying): Card A = -30deg, Card B = +20deg, Card C = +30deg.

**Canvas cards gather**: Translate canvas cards so their anchor points (same placement: center-x, 4px from bottom) overlap perfectly with folder anchor at destination. Rotate to match IDLE fan: [-20, 0, 20].

**Z-index layering** (front to back, during gather/scatter via portal):
1. Card A
2. Canvas Card
3. Card B
4. Card C

**Folder layout**: `gap-4` between card container and label.

### Anchor Math

**Rotation anchor** for all cards: `transformOrigin: '50% calc(100% - 4px)'`
- Folder card (73x94): anchor at **(36.5, 90)**
- Canvas card (232x300): anchor at **(116, 296)**

**Folder anchor in canvas coordinates** (relative to folder entity position):
```
anchorX = FOLDER_SIZE/2 = 60     (thumbnail is centered in 120px folder)
anchorY = (120 - 94)/2 + (94 - 4) = 13 + 90 = 103
```

**Canvas card target position** (so anchors overlap):
```
target.x = folderPos.x + 60 - 116 = folderPos.x - 56
target.y = folderPos.y + 103 - 296 = folderPos.y - 193
```

Constants: `ANCHOR_OFFSET_X = 56`, `ANCHOR_OFFSET_Y = 193`

### Key insight: pure rotation spread

The previous system used center-origin rotation with translational offsets (`left`/`top`) to
create spread. The new system uses a bottom-center rotation anchor where **all spread comes
purely from rotation** — no positional offsets. This means:
- Portal card positions simplify (all targets at `(cardBaseLeft, cardBaseTop)`, no per-card offsets)
- Canvas cards during gathering align anchor points precisely with folder card anchors
- The card-deck metaphor is physically accurate — cards pivot from a shared point near the bottom

## Phase 10: Single-Child Scatter/Eject Positioning (2026-02-20)

### Problem

When a folder has only 1 child, ejecting or scattering it placed the card right
next to the folder — barely visible separation.

**Two code paths, same bug:**
- `ejectFromFolder` (clicking a thumbnail in the sheet): hardcoded `(folder.x + 40, folder.y - 60)` — just 40px right and 60px up from the folder.
- `scatterFolder` (Push All button): radial offset of 60–120px from viewport center. If the folder is near center, the card barely moves.

### Fix

Both paths now place a single child at exact viewport center:
```
x = vw/2 - CARD_W/2
y = vh/2 - CARD_H/2
```

Multi-child scatter keeps the existing radial spread logic unchanged.

`ejectFromFolder` gained an optional `viewport` parameter (same pattern as
`scatterFolder`). The call site in `SheetFolderContent.tsx` now measures the
canvas element and passes it for both paths.

### Lesson

When two functions do similar positioning (scatter vs eject), check both when
fixing one. The sheet UI has per-thumbnail click (`ejectFromFolder`) AND a
"Push all" button (`scatterFolder`) — the single-child case hits `ejectFromFolder`
more often because there's only one thumbnail to click.
