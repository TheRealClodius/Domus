# Card Hover Actions

## Summary

Two icon buttons appear top-right on card hover: **Add to Context** and **Maximize**. Pure CSS visibility toggle via Tailwind `group-hover`. No gradient scrim — buttons use tonal backgrounds for contrast against the card surface.

## Visual Structure

```
┌───────────────────────┐
│                 [+][⊞]│  ← top-right, opacity 0→1 on hover
│                       │
│  Summary text that    │
│  previews the doc...  │
│                       │
│  type · timestamp     │
└───────────────────────┘
```

## Actions

| Order | Icon | Action | Status |
|-------|------|--------|--------|
| 1 (left) | `ListPlus` | Add to context | TODO — agent context pinning not built yet |
| 2 (right) | `Maximize2` | Maximize | TODO — opens bottom sheet (separate task) |

## Implementation Details

- **Approach:** Pure CSS. Buttons always in DOM, hidden with `opacity-0`, shown on `group-hover` with `opacity-100`.
- **Pointer events:** `pointer-events-none` when hidden, `pointer-events-auto` when visible.
- **Button variant:** `icon-xs` from existing Button component.
- **Tonal contrast:** Buttons use a tonal background value distinct from `bg-surface-raised` (the card surface).
- **Transition:** 150ms (`DURATION.fast`), matching existing hover patterns.
- **Click handling:** `stopPropagation` to prevent triggering card drag.
- **Icons:** `ListPlus` and `Maximize2` from `lucide-react`.

## Design Doc Updates

- DESIGN-DIRECTION.md line 393: replaced "Gradient scrim overlay with action icons (expand, add to context, share)" with "Action icons appear top-right with tonal backgrounds for contrast (no scrim). Icons: add to context, maximize."

## Out of Scope

- Bottom sheet component (maximize target) — separate task
- Agent context pinning system — separate task
- Image card variant — not yet implemented
