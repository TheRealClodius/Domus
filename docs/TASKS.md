# Domus — Tasks

Prioritized work items. Check off as completed. Add new items at the bottom of the relevant section.

---

## In Progress

### Fix Folders

Folder entities now support click-to-scatter (children stored as `state.child_ids`, clicking ungroups them as cards in a grid). Remaining work:

- [ ] **Agent folder creation** — agent must set `state: { child_ids: [...] }` on folder entities and `presentation: 'hidden'` on children (backend change)
- [ ] **Folder label from agent** — agent should set `summary` to a meaningful name (e.g. "Research images"), not leave it empty
- [ ] **Entity z-index on scatter** — scattered children inherit their old `z_index`; may need a bump so they appear above existing canvas entities
- [ ] **Re-fold / undo scatter** — currently one-way (folder is archived); no way to re-group entities into a folder

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
- `app/api/agent/route.ts` — now requires auth (returns 401 if no session), validates space_id ownership, overwrites user_id from session
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
- [x] **Markdown rendering** — agent response text rendered via `react-markdown` instead of raw text (`core/chat/AgentMarkdown.tsx`)
- [ ] **Drag handle for pin-to-canvas** — grab panel to detach as canvas entity (`core/chat/ConversationPanel.tsx:72`)
- [ ] **Auto-collapse during streaming** — collapse finished sections while agent is still generating
- [ ] **Cross-session persistence** — persist conversation turns across page reloads
- [ ] **Google Drive integration** — attach Google Drive files as context items (`core/chat/PromptInputMenu.tsx:154`)

### Rename `core/chat/` → `core/agent-chat/`

Update directory name and all imports across the codebase to disambiguate from the multi-user chat app (`apps/chat/`).

- [ ] Rename directory
- [ ] Update all import paths
- [ ] Update any references in docs/comments

### Design System Polish

- [x] **WindowControl gradient tokenization** — replaced hardcoded hex gradient with `--control-close-from/to/dot` tokens
- [x] **Kalice Trial font** — set up as `next/font/local` in `app/layout.tsx`
- [x] **Dark mode audit** — all component tokens have dark variants, theme store + settings app enable switching

### Canvas Features

- [ ] **Pan & zoom** — infinite canvas with scroll-wheel zoom and drag-to-pan
- [ ] **Viewport culling** — only render entities within visible viewport + buffer margin
- [ ] **Entry choreography** — staggered fade-in sequence (background → canvas → chrome → entities)
- [ ] **Persist entity positions, sizes & z-order** — write `position_x`, `position_y`, `width`, `height`, `z_index` back to Supabase on drag-end / resize-end / focus. Debounce writes, batch concurrent changes, skip writes for unchanged values

### Apps — Phase 2

App registry and dock wiring are complete (`apps/` directory, `_registry.ts`, `_types.ts`, two stub apps). These items complete the app system:

- [ ] **BlockRenderer** for composed/agent-generated apps
- [ ] **Block primitives** (heading, text, list, checklist, table, key-value, etc.)
- [ ] **ComposedApp type** + runtime derivation in registry
- [ ] **Notes as BuiltInApp** (RichEditor in all modes, proper reducer/summarizer)
- [ ] **Chat app internals** (message list, input bar, conversation history)
- [x] **Calendar app internals** (month/week/day/agenda views, event CRUD, card presentation, agent glow)
- [x] **Google Calendar integration** — dedicated connect/callback OAuth flow + bidirectional event sync (create/update/delete) + periodic/foreground refresh
- [ ] **Google Calendar pagination** — handle `nextPageToken` when event sets exceed single-page limits
- [ ] **Google Calendar secondary calendars** — support non-primary/shared calendars (not just `primary`)
- [ ] **Google Calendar card parity** — show connected Google events in card presentation, not only window views
- [ ] **Google Calendar sync resilience** — richer user-facing reconnect/retry states beyond inline error text
- [ ] **Sidebar presentation** component
- [ ] **Popover click-origin positioning** — anchor popovers to click target instead of hardcoded (200,200)
- [x] **FolderStack grouping** logic + click-to-scatter
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

## Future

### Entity-Discoverable Actions (Internal MCP)

Each entity exposes its own capability schema so the agent discovers what it can do at runtime — no hardcoded knowledge per app. Schema lives on the entity instance, not the app type, because different instances have different capabilities (calendar events have RSVP/reschedule, messages have reactions, images have crop/resize).

Any entity on the canvas can be interrogated by the agent: "I need to do X to you — what commands do you expose?" Two possible approaches:
1. **Schema-only** — entity returns a tool schema, Domus agent performs tool calls against it (simpler, one agent)
2. **Mini-agent per entity** — each entity has its own lightweight agent that handles requests (more autonomous, heavier)

Leaning toward (1): entities expose schemas, Domus agent does the orchestration via multi-tool-call.

Flow: agent resolves target entity → asks "what can I do with you?" → entity returns tool schema → agent calls the appropriate tool → app executes and updates entity state.

Each app is effectively a self-describing MCP server. Adding a new app automatically extends the agent's capabilities with zero agent-side changes.

A key property of this design: the agent can work with **novel entity types it has never seen before**. Because capabilities are discovered at runtime from the entity itself, not baked into the agent's training or tool list, the system is open-ended. The agent doesn't need to be updated when new entity types are added — it just queries the schema and proceeds.

Once the design is settled, update the `/create-app` skill to include exposing entity schemas to the agent as part of the app creation workflow.

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

### Security & Reliability Fixes
- [x] **Mermaid SVG XSS** — DOMPurify sanitization on MermaidBlock innerHTML (`core/editor/extensions/MermaidBlock.tsx`)
- [x] **Space page authorization** — `notFound()` guard when space query returns null (`app/space/[id]/page.tsx`)
- [x] **API agent payload limits** — Content-Length check + post-parse byte-size check via `TextEncoder`, 25MB cap (`app/api/agent/route.ts`)
- [x] **API agent rate limiting** — in-memory sliding-window rate limiter, 20 req/min per user (`app/api/agent/rateLimit.ts`)
- [x] **API agent space_id ownership** — belt-and-suspenders `.eq('user_id', user.id)` query before forwarding to agent (`app/api/agent/route.ts`)
- [x] **API agent user_id overwrite** — session user_id always overwrites client-supplied value (`app/api/agent/route.ts`)
- [x] **Client payload filtering** — `serializeContextItems` filters files > 10MB, throws on total > 25MB (`core/chat/useAgentStream.ts`)
- [x] **Chat Realtime authorization** — replaced broadcast message delivery with `postgres_changes` (RLS-enforced CDC) (`apps/chat/useChatChannel.ts`)
- [x] **Chat join group RPC** — `join_group_via_invite` SECURITY DEFINER function bypasses RLS for invite-code joins (`supabase/migrations/20260218000001_fix_chat_members_rls.sql`)
- [x] **Chat media storage privacy** — signed URLs instead of public URLs, user-prefixed paths, owner-only bucket policies (`apps/chat/useMediaUpload.ts`)
- [x] **Entity CDC subscription** — `postgres_changes` on entities table for DB-to-client sync, `_fromCDC` flag prevents infinite loops (`core/supabase/entitySync.ts`)
- [x] **Entity persistence fix** — client-generated ULID IDs incompatible with Postgres `uuid` column; switched to `crypto.randomUUID()`, added upsert error logging, beforeunload flush for pending debounced writes (`core/supabase/entitySync.ts`, `core/canvas/createEntityFromApp.ts`, `apps/calendar/CalendarApp.tsx`)
- [x] **Archive immediate sync** — archiving (deleting) a card now syncs to Supabase immediately (no debounce), preventing archived entities from reappearing after logout/login (`core/supabase/entitySync.ts`)
- [x] **Test suite stabilization** — global `scrollIntoView` mock in `vitest.setup.ts`, fixed calendar test failures
