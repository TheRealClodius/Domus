# Domus — Tasks

Prioritized work items. Check off as completed. Add new items at the bottom of the relevant section.

---

## In Progress

### ~~AI Entity Summary Generation~~ ✅ Done

- [x] `summarizeOn?` + `summarizeDebounceMs?` fields added to `BuiltInApp` interface (`apps/_types.ts`)
- [x] `POST /api/entities/[id]/summarize` route — Gemini call + Supabase write, failure-safe
- [x] `AppRenderer.tsx` — fires debounced AI summary after meaningful dispatches
- [x] Per-app `summarizeOn` defined: sounds (3s debounce), calendar, folder, chat (never), settings (never)
- [x] Model configurable via `GEMINI_SUMMARY_MODEL` env var (default: `gemini-2.0-flash-lite`)
- [x] `GOOGLE_API_KEY` env var required (add to `.env.local` and Vercel)
- [x] 7 tests covering success, Gemini failure, empty response, auth, 404, missing fields

---

### Fix Folders

Folder entities support click-to-scatter on the frontend (children stored as `state.child_ids`, clicking ungroups them as cards in a grid). The agent can now manage folder membership via `get_entity_schema` + `call_entity_tool` — `add_children`, `remove_child`, and `scatter` are fully wired with child-entity side effects (`_folderId` patches). Remaining work:

- [x] **Archive folders on disband** — `scatterFolder` (empty + phase 2) and `ejectFromFolder` (last child) now set `archived: true` instead of `presentation: 'hidden'`, preventing ghost folders
- [x] **Delete orphaned note entities** — migration `20260304000002` deletes all note entities (no registered app, no reopen path, 12 hidden notes were dead data)
- [x] **Remove dead NoteRenderer** — `AppRenderer.tsx` no longer has a `NoteRenderer` function or `entity.type === 'note'` branch; notes fall through to `FallbackRenderer`
- [x] **Cards cannot be hidden** — folder children no longer use `presentation: 'hidden'`; visibility is controlled by `state._folderId` (hidden when set, visible when cleared or when `_scatterOrigin` is also set during scatter animation). `getVisibleEntities()` and canvas `visible` filter both enforce this. `gatherEntities` Phase 3 no longer sets `presentation: 'hidden'` on children.
- [x] **Archive hidden card entities** — migration `20260304000003` archives all non-window entities with `presentation: 'hidden'` (50+ orphaned cards/folders/calendar_events the user had effectively deleted). Only `chat`, `calendar`, `settings`, `sounds` may legitimately be hidden.
- [x] **Generated apps always window** — entities with `state._code` get `presentation: 'window'` regardless of type registration. Fixed in `POST /api/entities`, `PATCH /api/entities/[id]`, `entitySync.ts` CDC coercion, and `SpaceRenderer` rendering. Migration `20260304000004` corrects existing rows.
- [ ] **Wire agent to use `call_entity_tool`** — Python agent backend must be updated to call `POST /api/entities/{id}/call` for folder operations instead of writing `state.child_ids` directly via `update_entity` (backend change)
- [ ] **Folder label from agent** — agent should set `summary` to a meaningful name (e.g. "Research images"), not leave it empty
- [ ] **Entity z-index on scatter** — scattered children inherit their old `z_index`; may need a bump so they appear above existing canvas entities
- [ ] **Re-fold / undo scatter** — currently one-way (folder is archived on scatter); no way to re-group entities into a folder
- [ ] **Better animation logic** — spring tuning for scatter/gather, smoother enter/exit transitions
- [ ] **Expand on hover** — preview folder children before triggering scatter
- [ ] **Add entity to existing folder** — drag-onto-folder gesture to group an entity into an existing folder

---

### Agent Action Reliability

Fixes from merge review (`docs/reviews/2026-03-04-main-merge-review.md`). Hardens the `ui_action` protocol introduced in PR #9.

- [x] **Action-result route propagates upstream failures** — `app/api/agent/action-result/route.ts` now returns non-2xx when the agent backend responds with an error, instead of always returning `{ ok: true }`
- [x] **Client retry with backoff** — `postActionResult` in `agentActionInterpreter.ts` retries up to 3× with exponential backoff (1s/2s/4s) for 5xx and network errors; 4xx errors are not retried
- [x] **Turn-scoped queue isolation** — queued animation actions (gather/scatter/eject) capture a turn generation token; `resetTurnState()` increments the generation and clears the queue, so stale callbacks from a prior turn never execute or post results
- [x] **Missing stream context warning** — `consumeAgentStream.ts` logs a warning when `ui_action` arrives without stream context instead of silently dropping it
- [x] **Contract tests** — 17 tests covering unknown actions, missing params, and cross-turn queue isolation
- [ ] **CDC echo suppression hardening** — replace time-based `SELF_WRITE_EXPIRY_MS` with version-aware suppression (deferred — separate spike recommended)

---

## Up Next

### Chat Window Internals

The chat window shell (proportions, shadow, header) is aligned with Figma. These interior components still need implementation:

- [x] **ChatBubble component** (`apps/chat/MessageBubble.tsx`) — sent vs received variants with asymmetric radius
- [x] **Chat sidebar** — conversation/group list panel inside the chat window
- [x] **Chat message list** — scrollable message area with auto-scroll, edge fade
- [x] **Chat input bar** — prompt input rendered inside the chat window
- [x] **User search + DM flow** — find users by username, start 1:1 conversations with dedup
- [x] **Media path persistence** — `media_path` column replaces signed URLs, proxy re-signs on demand
- [x] **Realtime channel scaling** — single active channel instead of N channels per group
- [x] **Group modal wiring** — join/create modals fully functional with loading/error states

### Wire Up Agent Send Flow

- [x] **Upload context items** — `serializeContextItems` base64-encodes files, enforces 10 MB per-file / 25 MB total limits; called in `handleSend` and passed through to `sendMessage`
- [x] **Wire `handleSend`** — calls `sendMessage()` with text, space_id, user_id, context items, viewport dimensions, focused/visible entity IDs
- [x] **Consume SSE stream** — reads `parseSSEEvent` output, applies entity upserts to `entityStore`, handles text deltas
- [x] **Viewport + focus context** — `handleSend` reads `entityState.focusedId`, `entityState.getVisibleEntities()`, and canvas client dimensions; all passed to `sendMessage`
- [x] **isGenerating state** — set true while streaming, false on stream end/error; wired to PromptInput
- [x] **Stop/cancel** — `AbortController` created per send, signal passed into `sendMessage`, `onStop` wired to `abortRef.current?.abort()` in `AgentChat.tsx`

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
- [ ] **Drag-to-pin + resize** — grab handle to detach ConversationPanel as a persistent canvas entity; resize handles to control panel dimensions once pinned (`core/chat/ConversationPanel.tsx`)
- [ ] **Streaming-to-collapsed transition** — agent text streams in live during the turn; on `completeTurn`, the full text animates/springs into the collapsed summary row instead of snapping (currently turns are born collapsed with no streaming phase)
- [ ] **Cross-session persistence** — persist conversation turns across page reloads
- [ ] **Google Drive integration** — attach Google Drive files as context items (`core/chat/PromptInputMenu.tsx:154`)
- [x] **Visual feedback for all agent operations** — entity attention ring (`shadow-agent-attention` pulsing CSS animation) fires on `read_entity`/`update_entity` tool calls; `query_entities` results flash briefly (1.5s); panel auto-reopens on each agent turn; mini activity chip above input when panel is dismissed mid-stream
- [ ] **Open agent chat manually** — button or keyboard shortcut to show ConversationPanel independently of typing

### Agent Response Observability

Right now there is no visible feedback between sending a prompt and the first SSE event arriving. `ActiveTurn` returns `null` when `currentTurn` has no text and no tool calls yet — the panel is open but blank. When text does arrive, all deltas are concatenated into one string with no structural separation between thinking prose and tool-call steps.

- [x] **Coalescing shimmer chip** — animated shimmer chip with cycling label ("Coalescing…", "Assembling…", etc.) renders immediately when `currentTurn` is set but has no content yet; disappears on first text delta or tool call (`core/chat/ActiveTurn.tsx`)
- [x] **Tool call context labels** — ActionChips show entity type ("Creating note…") and query context ("Searching "project ideas"…") derived from tool args (`core/chat/ActionChip.tsx` + `core/chat/actionLabel.ts`)
- [x] **Paragraph spacing** — `.agent-markdown p` margin increased from `0.25em` to `0.6em` for visible paragraph breaks
- [x] **Panel auto-reopen on agent turn** — `startAgentTurn()` sets `panelVisible: true`; panel always comes back when the agent begins responding, even if the user dismissed it (`core/chat/conversationStore.ts`)
- [x] **Mini activity chip** — compact animated chip above PromptInput while streaming with panel dismissed; shows current tool label from shared `getActionLabel()` util; clicking reopens panel (`core/chat/AgentChat.tsx`)
- [x] **Entity attention ring** — `agentActiveIds: Set<string>` in entityStore; `read_entity` and `update_entity` tool calls add the entity id, result clears it; `query_entities` results flash for 1.5s; `done`/`error`/stream-end clears all; pulsing `shadow-agent-attention` CSS animation (orange ring, 1.2s) applies to both Window and CanvasCard when id is in the set (`core/entityStore.ts`, `core/chat/consumeAgentStream.ts`, `core/entity/Window.tsx`, `core/entity/CanvasCard.tsx`, `tokens/tokens.css`)
- [ ] **Thinking… shimmer state** — transition from "Coalescing…" to a "Thinking…" shimmer on first thinking token; requires Python agent to emit `thinking_delta` / `thinking_start` SSE events (`core/chat/ActiveTurn.tsx`)
- [ ] **Text paragraph structure** — agent text between tool calls should render as visually distinct steps/paragraphs, not one concatenated blob; either split on double-newlines into separate text nodes, or ensure the agent sends structural delimiters between reasoning steps

### Rename `core/chat/` → `core/agent-chat/`

Update directory name and all imports across the codebase to disambiguate from the multi-user chat app (`apps/chat/`).

- [ ] Rename directory
- [ ] Update all import paths
- [ ] Update any references in docs/comments

### Design System Polish

- [x] **WindowControl gradient tokenization** — replaced hardcoded hex gradient with `--control-close-from/to/dot` tokens
- [x] **Kalice Trial font** — set up as `next/font/local` in `app/layout.tsx`
- [x] **Dark mode audit** — all component tokens have dark variants, theme store + settings app enable switching
- [ ] **Hover tooltip tags on app dock icons** — show app name on hover (like macOS dock labels)

### Canvas Features

- [ ] **Pan & zoom** — infinite canvas with scroll-wheel zoom and drag-to-pan
- [ ] **Viewport culling** — only render entities within visible viewport + buffer margin
- [ ] **Entry choreography** — staggered fade-in sequence (background → canvas → chrome → entities)
- [ ] **Persist entity positions, sizes & z-order** — write `position_x`, `position_y`, `width`, `height`, `z_index` back to Supabase on drag-end / resize-end / focus. Debounce writes, batch concurrent changes, skip writes for unchanged values
- [ ] **Fix drag bugs on canvas** — card + window positioning off after drag, Framer Motion on-drag glitches, shift+click deselect (currently only ESC clears selection)
  - [x] Text/image selection during drag — `userSelect: none` permanently on `CanvasCard` (always a drag surface) and on `WindowHeader` drag zone; `onPointerDown` on drag zone fires before gesture threshold to suppress window body content selection
- [ ] **Better auto card tiling** — smarter layout algorithm when agent places multiple cards simultaneously
- [ ] **Create new document from canvas** — empty note entity via canvas UI gesture (without agent)
- [ ] **Add agent chat panel in sheet** — ConversationPanel accessible from bottom-sheet context

### Apps — Phase 2

App registry and dock wiring are complete (`apps/` directory, `_registry.ts`, `_types.ts`, two stub apps). These items complete the app system:

- [x] ~~**BlockRenderer** for composed/agent-generated apps~~ — superseded by iframe sandbox spike (2026-02-20). Agent generates React code rendered via `react-runner` in sandboxed iframe. See `spikes/2026-02-20-iframe-sandbox/FINDINGS.md`
- [x] ~~**Block primitives**~~ — superseded. Generated apps use full `core/ui/` component scope + all Lucide icons instead of a block primitive library
- [x] ~~**ComposedApp type** + runtime derivation in registry~~ — superseded. Generated apps detected by `state._code` in entity state, dispatched to `IframeSandbox` by `AppRenderer`
- [ ] **Notes as BuiltInApp** (RichEditor in all modes, proper reducer/summarizer)
- [ ] **Chat app — V1 milestone** — message reactions, inline media preview. (Read receipts, push notifications, message search → post-launch, see Chat — Next Wave)
- [ ] **Minimum fixed W/H for settings app and sound app windows** — prevent windows from collapsing below usable dimensions
- [x] **Calendar app internals** (month/week/day/agenda views, event CRUD, card presentation, agent glow)
- [x] **Google Calendar integration** — dedicated connect/callback OAuth flow + bidirectional event sync (create/update/delete) + periodic/foreground refresh
- [ ] **Google Calendar pagination** — handle `nextPageToken` when event sets exceed single-page limits
- [ ] **Google Calendar secondary calendars** — support non-primary/shared calendars (not just `primary`)
- [ ] **Google Calendar card parity** — show connected Google events in card presentation, not only window views
- [ ] **Google Calendar sync resilience** — richer user-facing reconnect/retry states beyond inline error text
- [ ] **Sidebar presentation** component
- [ ] **Popover click-origin positioning** — anchor popovers to click target instead of hardcoded (200,200)
- [x] **FolderStack grouping** logic + click-to-scatter
- [x] **Folder entity schema** (`apps/folder/index.ts`) — `getSchema`, `reduce`, `summarize`; registered in `_registry.ts` (non-dock); `call` route applies child-entity side effects (`add_children` / `remove_child` / `scatter`)
- [ ] **Dispatch wiring** (reducer → Supabase write path)
- [ ] **Auto-discovery alternative** (`import.meta.glob` replacement or build-time codegen)

### Generated Apps — Follow-up

Iframe sandbox spike validated (2026-02-20). Core architecture works end-to-end. These items remain for production readiness:

- [x] **Delete generated apps from dock** — right-click context menu on generated app dock icons (Open / Delete); confirm dialog prevents accidents; optimistic `archive()` + fire-and-forget `DELETE /api/entities/[id]`; built-in dock items have no context menu
- [ ] **Token-only colors** — builder prompt must enforce semantic tokens exclusively (`bg-surface-lowest`, `text-on-surface`, etc.), no raw Tailwind colors. Currently generated apps don't respond to theming
- [ ] **Hover states** — teach builder to add `hover:bg-on-surface/8`, `transition-colors`, `active:scale-95` to interactive elements
- [ ] **Spacing and padding rhythm** — enforce `p-4` outer, `p-3` inner cards, `gap-2`/`gap-3` between items
- [ ] **Scroll views and sticky headers** — `flex-1 overflow-auto` for scrollable body, sticky headers for navigation
- [ ] **Window layout conventions** — apps must follow DESIGN-DIRECTION: `px-4` horizontal padding, apps own vertical layout, scroll-fade on scroll views, floating input at `bottom-6`
- [ ] **Loading states during generation** — skeleton/spinner while agent generates code, streaming progress messages ("thinking...", "writing code...")
- [ ] **Agent-initiated entity deletion with user confirmation** — agent emits a `confirmation_required` SSE event with `{ entity_id, entity_summary, action: 'delete' }`; frontend pauses stream and shows a blocking modal; user clicks "Agree" or "Cancel"; frontend sends a follow-up message to the agent ("confirmed" or "cancelled"); agent proceeds or aborts. Two-turn pattern — agent must handle a confirmation reply message type. Soft-delete (archive) on confirm, no-op on cancel.
- [ ] **Font CORS in sandbox** — `sandbox="allow-scripts"` blocks cross-origin fonts. Either serve fonts from same origin, inline font data, or add `allow-same-origin` with CSP
- [ ] **Tailwind safelist maintenance** — runtime classes need manual safelist. Consider automated approach or CSS-in-JS fallback for edge cases

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
- [ ] **Immersive doc editing in sheet** — full-screen rich editor when opening a note entity in a sheet
- [ ] **Edit images in sheet manually** — crop, rotate, annotate without the agent
- [ ] **Edit images in sheet with agent** — agent can crop, annotate, or regenerate in sheet context

---

## Future

### Chat — Next Wave

- [ ] **Push notifications / offline reachability** — service worker web push so users receive messages when the chat app isn't mounted
- [ ] **Read receipts** — update `last_read_at` in realtime, show delivered/read indicators per message
- [ ] **Local message cache** — IndexedDB or localStorage cache to avoid cold-start re-fetch every session
- [ ] **Realtime unread counts** — per-user Postgres trigger + pg_notify channel for push-based unread updates across non-active groups

### Entity-Discoverable Actions (Internal MCP)

Two-level discovery: the agent can learn what types exist and what instances can do — entirely at runtime, nothing hardcoded in the system prompt or agent code.

**Level 1 — Type catalog (what can I create?):** `GET /api/entity-types` returns all built-in types with `description`, `defaultPresentation`, `defaultSize`, `initialState`, and `maxInstances`. Every `BuiltInApp` must declare a `description`. The agent calls `list_entity_types` when it needs to know what types are available before calling `create_entity`. Adding a new app to `apps/` immediately makes it discoverable — zero agent-side changes required.

**Level 2 — Instance capabilities (what can I do to this entity?):** Schema lives on the entity instance, not the app type, because different instances have different capabilities (a full folder exposes `remove_child`; an empty one does not). The agent calls `get_entity_schema(entity_id)` → `GET /api/entities/{id}/schema` to inspect available actions, then `call_entity_tool` → `POST /api/entities/{id}/call` to invoke them. The route validates against schema, applies `reduce`, writes new state + summary, then applies entity-type-specific side effects.

**What is live:**
- `GET /api/entity-types` — type catalog endpoint (no auth, static metadata)
- `GET /api/entities/{id}/schema` — instance schema endpoint (calendar, sounds, folder all wired)
- `POST /api/entities/{id}/call` — invoke endpoint (folder child management, calendar view, sounds playback)
- `description` + `initialState` on every `BuiltInApp`
- `getAllAppTypes()` in `_registry.ts`

**What still needs wiring (agent side):**
- `list_entity_types` tool in `tools.py` calling `GET /api/entity-types`
- `get_entity_schema` and `call_entity_tool` tools wired in `tools.py`
- Remove per-type descriptions from `_BASE_INSTRUCTIONS` in `context.py` — they are now redundant and contradict the discovery-first design

**Key implementation decision:** `reduce` is a pure function (no DB calls). Side effects (e.g. patching child entities on folder operations) live in the call route, applied after the entity's own state is written. Side-effect failures are caught and logged but never fail the main response — the entity's state is always consistent even if a child patch fails.

Update the `/create-app` skill to include adding `description` + `initialState` + `getSchema` as part of the app creation checklist.

### Spaces

- [ ] **Create new spaces + space templates** — blank space creation UI; Starter template; template picker modal

### Google Drive

- [ ] **Import from Google Drive** — docs/sheets/slides as entities on the canvas; Drive OAuth flow, file picker UI, download + entity creation (*depends on agent-side MIME-type handlers*)

### Marketing

- [ ] **Quick landing page at `/`** — marketing content for unauthenticated visitors; authenticated users redirect to their space (rework of `app/page.tsx`, natural pairing with Guest Session Flow)

### Dev Tools

- [ ] **Agent observability dev-mode panel** — inspect agent context, tool calls, token usage in a UI overlay (*depends on agent-side token count fields on `done` event*)

---

## Completed

### Login Gate
- [x] Session check — server-side: unauthenticated users see login UI with Google Sign-In button
- [x] Space lookup — read `active_space_id` from user profile; first-space fallback; server-side `createSpaceForUser` if none
- [x] Redirect to real UUID — `redirect(/space/{uuid})` (no more hardcoded `/space/default`)
- [x] Drop anonymous auth — removed `GuestSessionBootstrap`, `linkIdentity` upgrade path, and all guest-mode complexity

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
- [x] **Image-adaptive card overlays** (`useImageTone` hook) — samples top/bottom image zones via canvas API, adapts grab handle dot color and gradient scrim to image brightness; `crossOrigin="anonymous"` on image elements for CORS-safe pixel reads

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

### Usage Tracking, Tier Limits, Quota Errors (Phase 12)
- [x] **Fix `plan` default** — profile GET/PATCH route returns `plan: null` (not `'citizen'`) when DB row has no plan set; `UserProfile.plan` type updated to `string | null`; BillingSection handles null with 'Domus Free' label; `PLAN_LABELS` extended with `free` and `extra` entries
- [x] **Migration `20260303000000_usage_events.sql`** — adds `plan`, `plan_period_start`, `plan_period_end` columns to `users` with `IF NOT EXISTS` guard; creates `usage_events` table with RLS, index on `(user_id, event_type, created_at DESC)`, and service-role bypass for agent inserts
- [x] **`GET /api/user/usage`** — returns per-event-type `{ used, limit }` objects plus `resets_at` and `plan` for the current billing window; determines window from `plan_period_start`/`end` or falls back to calendar month; derives limits from hardcoded tier table (free: 10/0/5, citizen: 200/20/50, extra: 1000/100/200)
- [x] **Profile store usage stats** — `UsageStats` interface + `usageStats`, `_usageFetched`, and lazy `fetchUsage()` added to `useProfileStore`; `fetchUsage` is triggered on mount in `UsageSection`, not on every profile open
- [x] **UsageSection** — replaces placeholder; shimmer skeleton while fetching; progress bars with `used / limit` count for paid plans (`citizen`/`extra`); free-plan upgrade CTA when `plan === null`
- [x] **Quota errors in chat** — `ErrorEvent` SSE type extended with `code?`, `resets_at?`, `retry_after?`; `conversationStore` gains `errorMeta`; agent route passes 429 body through verbatim; `useAgentStream` parses structured 429 into `err.meta`; `friendlyError()` handles `quota_exhausted` / `rate_limited` codes; `ConversationPanel` renders "View usage" deeplink button (opens profile → usage tab) when `errorMeta.code === 'quota_exhausted'`

### Security & Reliability Fixes
- [x] **Group avatar path persistence** — `chat_groups.avatar_path` (stable storage path) replaces signed `avatar_url` in DB; `ChatApp` resolves a fresh signed URL via `/api/chat/media` proxy on each load — same pattern as message media. Migrations `20260304000006` (column) + `20260304000007` (backfill existing rows from expired signed URLs via regex extraction).
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
- [x] **Memory entity presentation fix** — `presentationRules.ts` CDC coercion was stripping `presentation: 'hidden'` from `conversation_turn` and `fact` entities (forcing them to `card`) because unknown types defaulted to `['card']` as allowed presentations. `MEMORY_TYPES` set added to `lib/presentationRules.ts`; these types now always coerce to `hidden`. Migration `20260304000003` had also incorrectly archived all hidden non-window entities — wiping all agent memory. Migration `20260304000008` restores them.
- [x] **Test suite stabilization** — global `scrollIntoView` mock in `vitest.setup.ts`, fixed calendar test failures
- [x] **SheetStore defensive callback guard** — `_onCloseComplete` only set when value is a function, prevents runtime errors from undefined `onComplete` callers (`core/sheetStore.ts`)
