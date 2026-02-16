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

### Wire Up Agent Send Flow

The prompt input collects text + context items but `handleSend` in `AgentChat.tsx` is a no-op. Infrastructure partially exists (`app/api/agent/route.ts` SSE proxy, `useAgentStream.ts` with `sendMessage` + `parseSSEEvent`). What's missing:

- [ ] **Upload context items** — encode `ContextItem.file` as base64 (MVP) or upload to Supabase Storage, include in request payload
- [ ] **Wire `handleSend`** — call `sendMessage()` with text, space_id, user_id, context items, viewport dimensions, focused/visible entity IDs
- [ ] **Consume SSE stream** — read `parseSSEEvent` output, apply entity upserts to `entityStore`, handle text deltas
- [ ] **Viewport + focus context** — pass real values instead of hardcoded empties in `sendMessage()` (viewport from window, focused/visible from entityStore)
- [ ] **isGenerating state** — set true while streaming, false on stream end/error; wire to PromptInput
- [ ] **Stop/cancel** — implement AbortController in `sendMessage`, wire to `onStop` callback

### Design System Polish

- [ ] **WindowControl gradient tokenization** — replace hardcoded `#8F0000 → #FF0000` gradient with design tokens (see TODO in `core/entity/WindowControl.tsx`)
- [ ] **Kalice Trial font** — obtain font files and set up as `next/font/local` in `app/layout.tsx` (currently falls back to Inter)
- [ ] **Dark mode audit** — verify all new tokens (`shadow-card`, `shadow-window`, `font-display`) have correct dark theme equivalents and visual appearance

### Canvas Features

- [ ] **Pan & zoom** — infinite canvas with scroll-wheel zoom and drag-to-pan
- [ ] **Viewport culling** — only render entities within visible viewport + buffer margin
- [ ] **Entry choreography** — staggered fade-in sequence (background → canvas → chrome → entities)

### Apps — Phase 2

App registry and dock wiring are complete (`apps/` directory, `_registry.ts`, `_types.ts`, two stub apps). These items complete the app system:

- [ ] **BlockRenderer** for composed/agent-generated apps
- [ ] **Block primitives** (heading, text, list, checklist, table, key-value, etc.)
- [ ] **ComposedApp type** + runtime derivation in registry
- [ ] **Notes as BuiltInApp** (RichEditor in all modes, proper reducer/summarizer)
- [ ] **Chat app internals** (message list, input bar, conversation history)
- [ ] **Calendar app internals** (month/week/day views, event CRUD)
- [ ] **Sidebar presentation** component
- [ ] **FolderStack grouping** logic + click-to-open
- [ ] **Dispatch wiring** (reducer → Supabase write path)
- [ ] **Auto-discovery alternative** (`import.meta.glob` replacement or build-time codegen)

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

### Project Scaffolding
- [x] Next.js app scaffolding (layout, page, space route)
- [x] Build/dev config (biome, tsconfig, vitest, postcss, next.config)
- [x] Supabase client (browser + server)
- [x] Auth callback route (Google OAuth)
- [x] Agent API SSE proxy (`app/api/agent/route.ts`)
- [x] Type definitions (`lib/types.ts` — Entity, Space, ContextItem)
- [x] ID generation (`lib/id.ts`)

### Design Token System
- [x] Token system expansion (radius xs–2xl, shadow-card, shadow-window, font variables)
- [x] Design token pipeline (`tokens/palettes.ts`, `tokens/seeds.ts` — color generation from seed hues)
- [x] Inter font via next/font/google
- [x] Motion config (`lib/motion.ts` — spring presets: agent, snappy, popIn, gentle, page, prompt)

### State Management
- [x] Entity store (Zustand — CRUD, z-index, focus, mock data)
- [x] Sheet store (Zustand — open/close, active entity tracking)

### Canvas Layer
- [x] CanvasShell (canvas container)
- [x] SpaceRenderer (entity rendering dispatch on canvas)
- [x] SpaceHeader component (space name, pill buttons)
- [x] AppDock component (48px wide, icon stack)
- [x] useDragEntity (pointer-based entity dragging)
- [x] useResizeEntity (edge + corner resize handles)

### Entity Components
- [x] Window Figma alignment (shadow-window, transparent header, close control + app options)
- [x] WindowControl component (close button with gradient hover)
- [x] CanvasCard Figma alignment (236×302, shadow-card, font-display title, text-label body)
- [x] FolderStack component (stacked thumbnails with rotation)
- [x] GrabHandle + ResizeHandleVisual (interaction indicators)
- [x] AppRenderer (entity type → component dispatch)
- [x] useAgentGlow (agent glow animation hook)

### Chat / Prompt Input
- [x] PromptInput Figma alignment (362px idle, solid bg, 16px radius, border)
- [x] PromptInput chip system (PromptInputChip, PromptInputChips — context items as removable chips)
- [x] PromptInputMenu (attachment/action menu with MenuCard)
- [x] AgentChat panel (prompt + conversation wiring)
- [x] useAgentStream (SSE stream scaffolding — `sendMessage` + `parseSSEEvent`)
- [x] useAutoResize (textarea height auto-adjustment)
- [x] usePromptInputDrop (file drag-and-drop onto prompt bar)
- [x] usePromptInputState (text, context items, active state)
- [x] imagePreview utility (file → data URL)

### Full-Screen Sheet
- [x] FullScreenSheet (bottom sheet overlay with spring animation)
- [x] SheetBackdrop (canvas scale-down + dim)
- [x] SheetBody (scrollable content with edge-fade mask)
- [x] SheetHeader (close button left, action slots right)
- [x] SheetEntityContent (entity content rendered in sheet)
- [x] SpaceSheet (wires sheet to space context)

### Rich Editor
- [x] RichEditor (Tiptap-based rich text editing)
- [x] AgentCursor extension (agent typing indicator)
- [x] MermaidBlock extension (diagram rendering as SVG)

### App System — Phase 1
- [x] App types (`apps/_types.ts` — `BuiltInApp`, `AppProps`)
- [x] App registry (`apps/_registry.ts` — `getAppType()`, `getDockApps()`)
- [x] Chat stub app (`apps/chat/` — placeholder component + definition)
- [x] Calendar stub app (`apps/calendar/` — placeholder component + definition)
- [x] AppRenderer registry dispatch (looks up app by entity type)
- [x] Entity factory (`core/canvas/createEntityFromApp.ts`)
- [x] Dock wiring (SpaceRenderer creates entities from dock clicks)

### UI Primitives
- [x] Button, Input, Dialog, Tooltip, Context Menu, Sheet (Radix-based)
- [x] MenuCard component (floating card menu used by PromptInputMenu)
