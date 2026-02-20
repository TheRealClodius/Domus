# Design: Window Escape Resize for Chat Parting

**Date:** 2026-02-18
**Status:** Approved
**Context:** Spike — spatial recipes, `partForChat` algorithm

---

## Problem

When the chat panel opens, the parting recipe translates entity clusters clear of the chat zone. But windows that are wider than the available escape space end up partially behind the chat. The current algorithm has three bugs:

1. **Readability grow expands on the escape axis.** If escape is LEFT, grow increases width — pushing the window's right edge back into the chat zone.
2. **Shrink only triggers at scale < 0.85.** A window wider than the escape corridor doesn't get shrunk unless cluster compression is severe.
3. **No per-window overlap check after translation.** The algorithm checks the cluster bbox, not individual windows.

## Design: Fixed Two-Pass Escape + Grow

### Pass 1: Escape (translate + shrink-to-clear)

1. **Translate cluster** — existing logic unchanged (escape vectors, cluster scale, post-clamp with `VIEWPORT_INSET`).

2. **Per-window shrink-to-clear** (NEW, replaces the `scale < 0.85` heuristic):
   - After translation, for each resizable entity in the cluster:
     - Compute the entity's post-move rect (new position + current size)
     - Check if it overlaps the padded chat rect
     - If yes, shrink on the **escape axis** until the entity's edge clears the chat:
       - Escape LEFT: shrink width so right edge = `paddedChat.x - entity.x`
       - Escape RIGHT: shrink width so left edge clears, i.e. `newWidth = entity.x + entity.width - paddedChat.x - paddedChat.width`
       - Escape UP: shrink height analogously
       - Escape DOWN: shrink height analogously
     - Respect minimum size (`MIN_WINDOW_WIDTH = 300`, `MIN_WINDOW_HEIGHT = 200`)
     - If shrinking to minimum still doesn't clear: accept the overlap (chat has z-priority)

### Pass 2: Readability (grow perpendicular)

1. For each resizable entity (whether shrunk or not):
   - Grow on the **perpendicular** axis (escape was x → grow height; escape was y → grow width)
   - Available growth toward each edge:
     - Distance from entity edge to viewport edge minus `VIEWPORT_INSET`
   - Grow toward the edge with more room (prefer growing downward/rightward for visual stability)
   - Cap: don't exceed `viewport dimension - 2 * VIEWPORT_INSET` on the perpendicular axis
   - Only grow if spare space > `GROW_THRESHOLD` (80px)

### Inset enforcement

`VIEWPORT_INSET = 16` applies on all 4 edges:

| Layer | Inset? | Mechanism |
|---|---|---|
| `clampToViewport` | Yes | Primitive — all callers get it |
| Escape planning (`escapeWouldFit`, `computeFitScale`) | No | Full viewport for direction selection |
| `applyClusterTransform` post-clamp | Yes | Group shift respects inset |
| Pass 2 growth caps | Yes | Don't grow into the inset zone |
| `tileNewEntities` grid centering | Yes | Grid starts at inset |

### What gets saved for restoration

- Original positions (existing)
- Original sizes (existing)
- Both restored on unpart — window returns to pre-parting dimensions

## Not in scope

- Grow accounting for neighboring entities (would need spatial query per window)
- Perpendicular grow on entities that weren't shrunk (keep existing threshold behavior)
- Content-aware grow heuristics (always grow if space permits)
