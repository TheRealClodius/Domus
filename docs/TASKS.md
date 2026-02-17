# Domus — Tasks

Prioritized work items. Check off as completed. Add new items at the bottom of the relevant section.

---

## In Progress

_Nothing currently in progress._

---

## Up Next

### Guest Session Flow

Visitors hitting `/` currently redirect to `/space/default` — a hardcoded placeholder. The `space_id` column is `uuid` in Postgres, so the agent crashes with `invalid input syntax for type uuid: "default"`. Per ARCHITECTURE.md (ADR 32, Phase 1 items 3–4), the flow should be:

1. **Anonymous auth** — call `supabase.auth.signInAnonymously()` on first visit if no session exists. This gives a real Supabase user with `is_anonymous: true`. Do this client-side (middleware or layout).
2. **Sample space creation** — on anonymous sign-in, create a space row in Supabase (owner_id = anonymous user ID, name = "My Space" or similar). Use the Starter template if it exists, otherwise create a blank space.
3. **Redirect to real UUID** — `app/page.tsx` should read the user's `active_space_id` (or create one), then `redirect(/space/{uuid})`.
4. **Signed-in users** — same flow but skip anonymous auth. On first Google sign-in, if upgrading from anonymous, link the anonymous space to the real user. Otherwise create from Starter template.

**Key files:**
- `app/page.tsx` — replace `redirect('/space/default')` with session check + space creation + redirect
- `core/supabase/client.ts` / `core/supabase/server.ts` — anonymous auth helper
- `app/api/agent/route.ts` — already patched to allow guest requests through (passes `user_id: 'guest'`)
- `app/space/[id]/page.tsx` — currently passes `userId ?? 'guest'`, should pass the anonymous user ID instead

**References:**
- ARCHITECTURE.md: ADR 32 (guest mode via Supabase anonymous auth), Phase 1 items 3–4
- Supabase docs: `signInAnonymously()`, `linkIdentity()` for upgrade

### Chat Window Internals

The chat window shell (proportions, shadow, header) is aligned with Figma. These interior components still need implementation:

- [ ] **ChatBubble component** (`core/chat/ChatBubble.tsx`) — sent vs received variants with asymmetric radius (user: `radius-lg` on three corners, sharp bottom-right; agent: sharp bottom-left)
- [ ] **Chat sidebar** — conversation/group list panel inside the chat window, `radius-xl` (16px), glassmorphic background
- [ ] **Chat message list** — scrollable message area with auto-scroll, edge fade, timestamp-on-hover
- [ ] **Chat input bar** — dark theme variant of prompt input rendered inside the chat window (not the global prompt bar)

### Wire Up Agent Send Flow

The prompt input collects text + context items but `handleSend` in `AgentChat.tsx` is a no-op. Infrastructure partially exists (`app/api/agent/route.ts` SSE proxy, `useAgentStream.ts` with `sendMessage` + `parseSSEEvent`). What's missing:

- [ ] **Upload context items** — encode `ContextItem.file` as base64 (MVP) or upload to Supabase Storage, include in request payload
- [x] **Wire `handleSend`** — call `sendMessage()` with text, space_id, user_id, context items, viewport dimensions, focused/visible entity IDs
- [x] **Consume SSE stream** — read `parseSSEEvent` output, apply entity upserts to `entityStore`, handle text deltas
- [ ] **Viewport + focus context** — pass real values instead of hardcoded empties in `sendMessage()` (viewport from window, focused/visible from entityStore)
- [x] **isGenerating state** — set true while streaming, false on stream end/error; wire to PromptInput
- [ ] **Stop/cancel** — implement AbortController in `sendMessage`, wire to `onStop` callback (`core/chat/AgentChat.tsx:60`)

### Agent Conversation Display

Glassmorphic conversation panel above the prompt bar. Shows user bubbles, agent turns (summary + expandable), streaming text, and tool-call action chips. See `docs/plans/2026-02-16-agent-conversation-display-design.md`.

- [x] **SSE event types** — typed discriminated union (`core/chat/agentStreamTypes.ts`)
- [x] **Conversation store** — Zustand store for turns, currentTurn, status (`core/chat/conversationStore.ts`)
- [x] **SSE stream consumer** — reads stream, dispatches to stores (`core/chat/consumeAgentStream.ts`)
- [x] **UserBubble** — right-aligned user message bubble (`core/chat/UserBubble.tsx`)
- [x] **ActionChip** — tool-call pill with pending/done states (`core/chat/ActionChip.tsx`)
- [x] **AgentTurn** — collapsed summary + expandable full text (`core/chat/AgentTurn.tsx`)
- [x] **ActiveTurn** — streaming text + in-progress tool chips (`core/chat/ActiveTurn.tsx`)
- [x] **ConversationPanel** — glassmorphic container, auto-scroll, escape-dismiss (`core/chat/ConversationPanel.tsx`)
- [x] **AgentChat wiring** — handleSend → sendMessage → consumeAgentStream (`core/chat/AgentChat.tsx`)
- [ ] **Drag handle for pin-to-canvas** — grab panel to detach as canvas entity (`core/chat/ConversationPanel.tsx:72`)
- [ ] **Auto-collapse during streaming** — collapse finished sections while agent is still generating
- [ ] **Cross-session persistence** — persist conversation turns across page reloads
- [ ] **Google Drive integration** — attach Google Drive files as context items (`core/chat/PromptInputMenu.tsx:154`)

### Design System Polish

- [x] **WindowControl gradient tokenization** — replaced hardcoded hex gradient with `--control-close-from/to/dot` tokens
- [x] **Kalice Trial font** — set up as `next/font/local` in `app/layout.tsx`
- [x] **Dark mode audit** — all component tokens have dark variants, theme store + settings app enable switching

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
- [x] **Calendar app internals** (month/week/day/agenda views, event CRUD, card presentation, agent glow)
- [ ] **Google Calendar integration** — sync events bidirectionally with Google Calendar API (Google OAuth already configured)
- [ ] **Sidebar presentation** component
- [ ] **Popover click-origin positioning** — anchor popovers to click target instead of hardcoded (200,200)
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

### Dark Mode + Settings App
- [x] Theme store (`core/themeStore.ts`) — light/dark/system modes, matchMedia listener, localStorage persistence
- [x] Settings app (`apps/settings/`) — theme toggle with pill buttons, registered in dock
- [x] Layout inline script updated to handle 'system' mode

### Design System Polish
- [x] Tokenize all hardcoded colors across 6 components (button, WindowControl, GrabHandle, PromptInputChip, AppDock)
- [x] Add 16 new color tokens + shadow-dragging token (light + dark variants)
- [x] Replace inline `borderRadius: 20` with `rounded-2xl` / `rounded-full` classes
- [x] WindowControl gradient tokenization
- [x] Kalice Trial font setup

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
- [x] Singleton app enforcement (`maxInstances: 1` on chat/calendar — dock reveals existing, unhides hidden)

### UI Primitives
- [x] Button, Input, Dialog, Tooltip, Context Menu, Sheet (Radix-based)
- [x] MenuCard component (floating card menu used by PromptInputMenu)
