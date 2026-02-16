# Domus — Tasks

Prioritized work items. Check off as completed. Add new items at the bottom of the relevant section.

---

## In Progress

_Nothing currently in progress._

---

## Up Next

### Chat Window Internals

The chat window shell (proportions, shadow, header) is aligned with Figma. These interior components still need implementation:

- [ ] **ChatBubble component** (`core/chat/ChatBubble.tsx`) — sent vs received variants with asymmetric radius (user: `radius-lg` on three corners, sharp bottom-right; agent: sharp bottom-left)
- [ ] **Chat sidebar** — conversation/group list panel inside the chat window, `radius-xl` (16px), glassmorphic background
- [ ] **Chat message list** — scrollable message area with auto-scroll, edge fade, timestamp-on-hover
- [ ] **Chat input bar** — dark theme variant of prompt input rendered inside the chat window (not the global prompt bar)

### Design System Polish

- [ ] **WindowControl gradient tokenization** — replace hardcoded `#8F0000 → #FF0000` gradient with design tokens (see TODO in `core/entity/WindowControl.tsx`)
- [ ] **Kalice Trial font** — obtain font files and set up as `next/font/local` in `app/layout.tsx` (currently falls back to Inter)
- [ ] **Dark mode audit** — verify all new tokens (`shadow-card`, `shadow-window`, `font-display`) have correct dark theme equivalents and visual appearance

### Canvas Features

- [ ] **Pan & zoom** — infinite canvas with scroll-wheel zoom and drag-to-pan
- [ ] **Viewport culling** — only render entities within visible viewport + buffer margin
- [ ] **Entry choreography** — staggered fade-in sequence (background → canvas → chrome → entities)

### Rich Editor — Future Scope

- [ ] **Slash commands** — `/` menu for inserting blocks (headings, images, Mermaid, dividers)
- [ ] **Formatting toolbar** — floating toolbar on text selection for bold/italic/link/etc.
- [ ] **Drag-and-drop block reordering** — drag blocks to rearrange document structure
- [ ] **Image upload** — user uploads images directly into editor (currently agent-only)
- [ ] **Collaborative CRDT sync** — real-time multi-user editing via Supabase Realtime
- [ ] **Agent edit/replace operations** — agent can delete/modify existing content, not just append
- [ ] **Multi-region agent edits** — agent works in multiple document sections simultaneously
- [ ] **Diff view** — show what agent changed in a before/after view
- [ ] **Image editing in sheet** — crop, annotate, regenerate when viewing images full-screen

---

## Completed

- [x] Token system expansion (radius xs–2xl, shadow-card, shadow-window, font variables)
- [x] Inter font via next/font/google
- [x] CanvasCard Figma alignment (236×302, shadow-card, font-display title, text-label body)
- [x] PromptInput Figma alignment (362px idle, solid bg, 16px radius, border)
- [x] Window Figma alignment (shadow-window, glassmorphic header, asymmetric padding)
- [x] SpaceHeader component (space name, pill buttons)
- [x] AppDock component (48px wide, icon stack)
- [x] FolderStack component (stacked thumbnails with rotation)
