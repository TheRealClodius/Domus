# Domus — Architecture

This is the founding document. Every decision flows from here. Read this before writing a single line of code.

---

## What We're Building

An agent-first spatial OS. The AI agent is the primary interface and the canvas is the secondary interface. The canvas contains apps and cards. The user talks to the agent via text or voice, and the agent creates, edits, arranges, and manipulates everything on screen. The user can do the same by clicking and dragging cards and windows, maximising content by opening bottom sheets in order to focus on tasks. We use app windows or cards for thinkgs like notes, calendars, chat interfaces, images — they're all just rendering surfaces for what the agent produces or the user uploads in the space. The space is the thing that contains a specific set of entities (documents, images etc). An authenticated user can have multiple spaces, each with it's own focus and designation. At any point, a user might need an app that doesn't exist; when that happens, Domus creates that specific app and pins it in the user's space, ready to use, with persistence. 

The product feeling: you walk into a room and say what you need. The room rearranges itself, creates new doors when needed. You grab an manipulate items while you speak. You give writtern instructions and things just happen in front of you. You can take control at any point. Every surface is intelligent.

---

## North Star Principles

**1. Everything is an entity.**
A sticky note, a calendar, a chat window, a generated image, a memory of what the user said last week — they're all rows in the same table. The system does not structurally distinguish between them. The `type` field determines what component renders it. The `presentation` field determines how it's framed (window, sidebar panel, canvas card, hidden).

**2. The agent has 5 tools, not 15.**
`create_entity`, `update_entity`, `query_entities`, `read_entity`, `web_search`. Four tools operate on entities — every interaction (opening a window, editing a note, rearranging the canvas, adding a calendar event) is expressed through these four verbs. The fifth tool (`web_search`) lets the agent research external information via the Perplexity API. The agent communicates with the user through its natural text output, not through a tool. If you're tempted to add a sixth tool, you're doing something wrong.

**3. Apps declare, they don't orchestrate.**
An app is a folder with a schema (what the agent can do), a reducer (how user interactions mutate state), a summarizer (how the frontend generates summaries on user-driven changes), and a React component (what the user sees). Reducers are frontend-only — the agent writes raw state directly. No imperative `getCapabilities()`, no `executeAction()` callback, no registration step. Drop the folder in `apps/`, it exists.

**4. The database is the event bus.**
When the agent creates an entity, it's an INSERT. Supabase Realtime fires a CDC event. Every connected client receives it. No custom WebSocket server, no event emitter, no broadcast channel. Postgres change data capture is the only pub/sub mechanism.

**5. Auth is not our problem.**
Supabase Auth handles Google OAuth, session management, token refresh, and cookie security. Row-Level Security enforces user isolation at the query level. We write zero auth middleware.

**6. Claude direct, no abstraction for v1.**
The agent loop uses the Anthropic SDK directly. Sonnet for interactive turns, Opus for compaction. No provider abstraction, no multi-model routing. Gemini is used only for image generation, called as a backend service from `tools.py`. A provider abstraction can be added post-v1 when there's a real need.

**7. The agent runs in Python.**
The agent service is a standalone Python FastAPI process on Railway. It connects to Supabase Postgres directly. When it creates/updates entities, Supabase Realtime fires CDC events to the frontend automatically. The TypeScript frontend never touches the AI SDK.

**8. Entities summarize themselves.**
Every entity carries a `summary` field, written by whoever last mutated it. The agent writes summaries when it creates or updates entities — summarization is its strength. The frontend writes summaries when the user interacts directly, using the app's `summarize()` function. Readers never compute summaries — they read what's already there.

**9. Agentic search over pre-loaded context.**
The system prompt is thin: a lightweight index of entities (ID, type, summary) plus personality traits and the last few conversation turns for continuity. The agent discovers details on demand via `query_entities` and `read_entity` tool calls. No fat system prompts stuffed with every entity's full state. Context is loaded just-in-time, not pre-computed.

---

## Three Primitives

Everything in the system is built from three concepts:

### Space
A workspace owned by a user. Contains entities and a space-bound agent instance. One user can have multiple spaces. A space is the **unit of isolation** — you never see entities from another space, and the agent in one space has no knowledge of another. User isolation derives from space ownership: `spaces.user_id = auth.uid()`. Entities inherit isolation through `space_id → spaces.user_id` — there is no independent entity-level ownership. The `user_id` column on the entities table means "belongs to" (the space owner), not "created by" (that's `created_by`).

**Space lifecycle:**
- **Guest mode:** New visitors land in a pre-populated sample space without signing in. Supabase anonymous auth creates a temporary session. Guests can interact with sample entities (open, drag, read) and use the agent (prompt bar works, entities are created). After N interactions (agent turns and file uploads count — drags and opens do not), the agent prompts sign-in inline in chat — not a modal gate. Feature gate: guests can browse and interact but cannot create new entities beyond the limit.
<!-- TODO: Define exact value of N for guest mode interaction limit. -->
- **Guest data transition:** Anonymous data is not instantly deleted but is only transferred for **new signups**. If an anonymous user signs up (first-time Google auth), their guest-created space and entities are re-parented to the new permanent account. If an existing user happens to have an anonymous session (e.g., cleared cookies, different device), anonymous data is **never** merged into their existing account — it is orphaned and eventually cleaned up. This prevents accidental data contamination between accounts.
- **First sign-in:** Domus creates a space from the "Starter" template. Templates are pre-defined entity blueprints — not "default" spaces. If upgrading from guest mode, the sample space becomes the user's first space. The Starter template includes: a welcome note, a chat app entity, a calendar app entity, several generated images, a parsed PDF of a research paper, and initial personality traits. Enough to demonstrate the range of capabilities without feeling empty.
- **Creation:** Users can create new spaces (blank or from templates). v1 ships with one system template ("Starter"). Multiple templates + user-created templates are post-v1.
- **Switching:** The user profile tracks `active_space_id`. Switching spaces is a full context switch — different entities, different agent memory, different conversation history.
- **Deletion:** Deleting a space cascades to all its entities (Postgres `ON DELETE CASCADE`).
- **Hierarchy:** `User (Google OAuth or upgraded anonymous) → Space(s) → Entities + Space-Bound Agent`
- v1 supports Google sign-in via Supabase Auth + Supabase anonymous auth for guest mode.

**User discovery:**
- Each user has a unique `username` (set during onboarding, stored on the `users` table).
- Users find each other via username search or invite links.
- Invite links are shareable URLs that resolve to a user's profile, enabling chat initiation.
- RLS allows looking up other users' public profiles (username, name, avatar) but not their spaces or entities.

### Entity
Anything that exists in a space. The universal data structure:

```
id          uuid
space_id    uuid        → spaces.id
user_id     uuid        → users.id
type        text        'calendar' | 'note' | 'chat' | 'image' | 'conversation_turn' | 'fact' | ...
presentation text       'window' | 'card' | 'sidebar' | 'hidden'
position    jsonb       { x, y, locked }  — see "Entity Positioning"
size        jsonb       { width, height }
z_index     int
content     text        markdown body — the human-readable part of the entity
state       jsonb       structured data for renderers — only when a component needs typed fields
summary     text        one-line description, written by whoever last mutated the entity
created_by  text        'user' | 'agent'
archived    boolean
created_at  timestamptz
updated_at  timestamptz
```

A chat window is an entity. A sticky note is an entity. A generated image is an entity. A folder grouping related entities is an entity. A conversation turn in the agent's memory is a hidden entity. A user preference the agent has learned is a hidden entity. The system treats them all the same.

**Markdown-first, state when needed.** Most entities are primarily text. The `content` column holds markdown — the agent writes it, the user edits it, `react-markdown` or Tiptap renders it. The `state` column holds structured data only when a renderer genuinely needs typed fields (dates for calendar grid, coordinates for images, datasets for charts). The pattern:

| Situation | `content` | `state` |
|-----------|-----------|---------|
| The thing IS text (note, research, article, fact) | Full markdown | `{}` |
| The thing has text + structure (calendar event, image, chart) | Description/notes | Typed fields for rendering |
| The thing is purely structural (edge, folder reference) | Minimal or empty | Structured data |

Most entities in most scenarios land in row 1. The agent writes markdown ~80% of the time and only touches `state` when a renderer needs it. This keeps the agent's read/write surface simple — `read_entity` returns markdown the agent can understand without parsing JSON. `update_entity` writes markdown the user can edit without a custom UI.

**Folder entity:** An entity with `type: 'folder'` that visually groups other entities on the canvas. Folders reference their children via edge entities (`relation: 'contains'`). Folders are canvas-level groupings — they don't change the children's `space_id` or ownership. The agent creates folders when organizing the canvas (e.g., "group these by topic") or when the user requests it. Folder visual rendering (how children are visually contained, expand/collapse behavior) will be defined when planning this feature in detail.

**Calendar recurrence:** Recurring events (e.g., daily standups) are modeled as individual calendar event entities — one per occurrence. The agent creates the series on request. Calendar events can push a message to the agent to trigger actions (e.g., a reminder event fires and the agent sends an email notification). Recurrence rules are stored in the parent event's state for the agent to reference when creating new occurrences.

**Entity lifecycle:**
- **Close** (window X button) = set `presentation: 'hidden'`. Entity persists, still appears in the agent's entity index, can be reopened. Like minimizing to dock.
- **Delete** (explicit action, e.g., right-click menu) = set `archived: true`. Excluded from entity index and queries unless `include_archived: true`. Soft delete, recoverable.

**Entity positioning:**

Positions use a hybrid percentage/pixel model:

| Scenario | Position value | `locked` |
|---|---|---|
| Agent creates entity | `{ x: 50, y: 50, locked: false }` — center of viewport (percentage) | `false` |
| Subsequent single spawns | Previous + `{ x: +3, y: +3 }` offset (percentage) | `false` |
| Group spawn (multiple at once) | Tiled as cards, group midpoint at `{ x: 50, y: 50 }` | `false` |
| User drags entity | Stored as pixel coordinates | `true` |

Rendering: if `locked: false`, position is computed as `(x / 100) * viewportWidth`. If `locked: true`, position is used as raw pixels. Unlocked entities reflow on page refresh (not on live resize). User drag always locks to pixels.

The agent always creates with `locked: false` (percentages). Only user drag sets `locked: true`.

**Collision detection:** The frontend layout engine handles collision avoidance when placing new entities. When the agent creates entities at percentage coordinates, the layout engine checks for overlaps with existing entities and adjusts positions to avoid stacking. Post-v1: consider giving the agent pixel-level position control for precise spatial arrangements.

**Canvas interaction layer:** `@use-gesture` for all pointer input (entity drag, canvas pan/zoom via pinch and wheel). `motion` (import from `motion/react`) for all animation — spring physics for agent-originated entity movement (design pattern P6), instant transforms for user-originated actions, presence animations for entity mount/unmount, and the agent glow effect. Viewport culling is a position-vs-viewport-bounds filter before rendering — no library needed. Z-index management is a Zustand store operation (bump to max on focus).

### Agent
The orchestrator. Takes user input + a lightweight entity index, calls Claude (Sonnet), executes tool calls against the entities table, streams responses back. Stateless per request — all state lives in entities. Discovers context on demand via tool calls rather than pre-loading it. Runs as a Python FastAPI service on Railway, separate from the frontend.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR for first load, route handlers for SSE proxy, one frontend deployment |
| UI | React 19 | What we know, ecosystem for component libs |
| State | Zustand (single store) | One entity store. Not five stores for five concepts |
| Styling | Tailwind v4 + CSS custom properties | Token pipeline outputs custom properties, Tailwind consumes them |
| Database | Supabase Postgres | 3 tables. RLS for isolation. Managed |
| Realtime | Supabase Realtime | CDC on entities table. No custom WebSocket |
| Auth | Supabase Auth | Google OAuth. Zero custom auth code |
| File storage | Supabase Storage | Images, uploads. Pre-signed URLs |
| Agent service | Python FastAPI on Railway | Long-running agent loop, separate from frontend |
| AI (agent) | Claude — Anthropic SDK direct | Sonnet for interactive turns, Opus for compaction. No provider abstraction for v1 |
| AI (image gen) | Gemini (Google) | Image generation only. Called from `tools.py` as a backend service. $2K GCloud credits |
| AI (web search) | Perplexity API | Agent's external research tool. Returns sourced answers with citations. Called from `tools.py` |
| Payments | Stripe | Subscription billing for Domus Citizen. Checkout, portal, webhooks. No custom billing logic |
| Frontend deploy | Vercel | Managed. SSR + edge. Proxy to agent service for SSE |

**Frontend dependencies** (the platform itself):
- `next`
- `react`
- `@supabase/supabase-js`
- `zustand`
- `tailwindcss`
- `@tiptap/react` + `@tiptap/pm` + `@tiptap/starter-kit` + `@tiptap/extension-image` + `@tiptap/extension-placeholder` (rich text editing in sheets and document windows)
- `mermaid` (diagram rendering — agent-generated Mermaid renders inline as SVG in the editor)
- `motion` (entity animations, agent spring physics — rebranded from framer-motion, import from `motion/react`)
- `@use-gesture/react` (drag, pinch, wheel — entity dragging + canvas pan/zoom)
- `recharts` (chart block rendering in composed apps)
- `react-markdown` (text block markdown rendering in composed apps)
- `stripe` (server-side only — Checkout Sessions, Portal Sessions, webhook verification in Next.js API routes)

**Agent service dependencies** (Python 3.11+):
- `fastapi` >=0.129
- `uvicorn[standard]` >=0.40
- `anthropic` >=0.79
- `google-genai` >=1.63 (image generation only — replaces deprecated `google-generativeai`)
- `Pillow` >=11.0 (image processing in the generate → upload pipeline)
- `httpx` >=0.28 (Perplexity API calls)
- `supabase` >=2.28 (Python client, async via `acreate_client()`)
- `networkx` >=3.6 (requires Python 3.11+)
- `pytest` >=9.0 (dev)

Everything else is app-specific. A calendar app can pull in `date-fns`. A code editor can pull in `codemirror`. The platform stays thin.

---

## System Topology

```
┌─────────────────────────────┐
│        Vercel (Next.js)     │
│   Frontend + SSE proxy      │
│   Auth cookie → user_id     │
└──────────┬──────────────────┘
           │ HTTPS / SSE
           ▼
┌─────────────────────────────┐
│    Railway (Python FastAPI)  │
│   Agent loop + tools         │
│   Claude SDK (direct)        │
│   Knowledge graph (NetworkX) │
└──┬───────────┬───────────┬──┘
   │           │           │
   ▼           ▼           ▼
┌────────────┐ ┌────────┐ ┌──────────────┐
│  Supabase  │ │Perplx. │ │  Claude API  │
│  Postgres  │ │  API   │ │  (Anthropic) │
│  Auth      │ │ (web   │ │              │
│  Realtime  │ │search) │ │  Gemini API  │
│  Storage   │ │        │ │  (image gen) │
└────────────┘ └────────┘ └──────────────┘
```

**Service authentication:**
The Railway agent service is not publicly accessible. The Vercel SSE proxy (`/api/agent/route.ts`) is the only entry point. Authentication works in two layers:
1. **User auth:** Vercel validates the Supabase auth cookie → extracts `user_id`
2. **Service auth:** Vercel forwards to Railway with `Authorization: Bearer <DOMUS_SERVICE_TOKEN>` header. `DOMUS_SERVICE_TOKEN` is a shared high-entropy secret set as an env var on both Vercel and Railway. Railway rejects any request without a valid token.

The agent service trusts `user_id` and `space_id` from the payload because Vercel already validated the user. RLS on Supabase provides defense-in-depth — even if the service token leaks, queries are scoped by `user_id`.

**Storage isolation:**
Supabase Storage buckets use per-user, per-space path isolation: `/{user_id}/{space_id}/{filename}`. Storage policies mirror RLS — users can only read/write paths under their own `user_id` prefix. Files are served via pre-signed URLs (time-limited, scoped to the specific object). The agent service accesses storage via the service role key for upload/download operations on behalf of the user.

<!-- TODO: Write Supabase Storage bucket policies enforcing the /{user_id}/{space_id}/ path structure. -->

**Data flow (two channels):**
- **Agent changes (SSE primary):** User sends message → Vercel validates auth, proxies to Railway → FastAPI agent loop streams Claude calls → tool calls execute against Supabase Postgres → tool results (including created/updated entities) stream back via SSE → frontend applies entity changes immediately from SSE → React re-renders.
- **Non-agent changes (CDC):** User interacts directly with a window (drag, type, resize) → frontend writes to Supabase → CDC fires Realtime event → other tabs/sessions receive the update.
- **Reconciliation:** CDC events also fire for agent-created entities. The Zustand store treats all updates as idempotent upserts (keyed by entity ID). SSE delivers agent changes instantly; CDC confirms and handles everything else.

---

## SSE Proxy & Context Stack

When the user sends a message, the frontend POSTs to the SSE proxy, which forwards to Railway. The context stack defines exactly what travels at each hop.

**Frontend → Vercel proxy (`POST /api/agent/route.ts`):**

```typescript
{
  space_id: string,
  message: string,                    // the user's text input
  viewport: { width: number, height: number },  // for smart entity positioning
  focused_entity_id: string | null,   // what the user is currently interacting with
  visible_entity_ids: string[],       // what's on screen (for spatial awareness)
}
```

**Vercel proxy → Railway (adds auth context):**

```typescript
{
  ...above,
  user_id: string,  // extracted from Supabase auth cookie
}
// Header: Authorization: Bearer <DOMUS_SERVICE_TOKEN>
```

**Railway `context.py` assembles the system prompt from:**

| Source | What | How |
|---|---|---|
| Payload: `space_id` | Entity index (non-archived entities, including hidden) | `SELECT id, type, presentation, z_index, summary FROM entities WHERE space_id = ? AND NOT archived` |
| Payload: `message` + visible entity types | Relevant app schemas (1-3) | Match types mentioned in message + types of visible entities → fetch from schema cache |
| Payload: `space_id` | Personality traits | `SELECT state FROM entities WHERE type = 'personality_trait' AND space_id = ?` |
| Payload: `space_id` | Recent conversation turns (3-5) | `SELECT state FROM entities WHERE type = 'conversation_turn' ORDER BY created_at DESC LIMIT 5` |
| Payload: `focused_entity_id` | Current focus context | Mentioned in system prompt so agent knows what user is interacting with |
| Payload: `viewport` | Viewport dimensions | Passed to tools.py for smart entity positioning |
| Detection: `message` + `focused_entity_id` | Builder prompt (if composing) | If user intent implies composed app creation OR focused entity has `state.blocks` → inject builder prompt from `agent/prompts/builder.py` |

**What the frontend does NOT send** (agent service handles):
- Entity index, personality traits, conversation history — agent queries Supabase directly (fresher than frontend cache)
- App schemas — agent service fetches from Vercel's `/api/schemas` endpoint (or caches in-memory)
- Facts, graph edges — agent discovers on demand via tool calls

**Response:** SSE stream back through the proxy with text deltas, tool call indicators, and entity create/update payloads.

---

## Directory Structure

### Frontend (Vercel)

```
domus-web/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout: auth provider, theme, fonts
│   ├── page.tsx                    # Landing → redirect to space or onboarding
│   ├── auth/
│   │   └── callback/route.ts      # Supabase auth callback
│   ├── space/
│   │   └── [id]/
│   │       └── page.tsx            # SpaceRenderer — the main UI
│   └── api/
│       ├── agent/
│       │   └── route.ts            # SSE proxy to Railway agent service
│       ├── schemas/
│       │   └── route.ts            # App schemas as JSON (consumed by Python agent service)
│       └── webhooks/
│           └── stripe/
│               └── route.ts        # Stripe webhook handler (plan activation, renewal, cancellation)
│
├── apps/                           # Drop-in app system
│   ├── _registry.ts                # getAppType(), getDockApps() — manual registry for now
│   ├── _types.ts                   # BuiltInApp, AppProps type definitions
│   ├── calendar/
│   │   ├── index.ts                # App definition (singleton, maxInstances: 1)
│   │   └── CalendarApp.tsx         # React component (stub)
│   ├── chat/
│   │   ├── index.ts                # App definition (singleton, maxInstances: 1)
│   │   └── ChatApp.tsx             # React component (stub)
│   # Planned: notes/, image-gen/, files/ — not yet implemented
│
├── core/                           # Platform internals (not app-specific)
│   ├── canvas/                     # Canvas surface + chrome
│   │   ├── CanvasShell.tsx         # Canvas container with sheet-aware scale + inset
│   │   ├── SpaceRenderer.tsx       # Entity rendering dispatch on canvas
│   │   ├── SpaceHeader.tsx         # Space name, user controls, auth state
│   │   ├── AppDock.tsx             # App launcher icon stack (48px wide)
│   │   ├── createEntityFromApp.ts  # Entity factory from app definitions
│   │   ├── useDragEntity.ts        # Pointer-based entity dragging
│   │   └── useResizeEntity.ts      # Edge + corner resize handles
│   ├── entity/                     # Entity chrome components
│   │   ├── Window.tsx              # Window chrome: drag, resize, close, glow
│   │   ├── CanvasCard.tsx          # Canvas card chrome (236×302, hover actions)
│   │   ├── FolderStack.tsx         # Stacked thumbnails with rotation
│   │   ├── AppRenderer.tsx         # Resolves entity type → app component (with block renderer fallback)
│   │   ├── GrabHandle.tsx          # Drag interaction indicator
│   │   ├── ResizeHandleVisual.tsx  # Resize handle visuals
│   │   ├── WindowControl.tsx       # Close button with gradient hover
│   │   └── useAgentGlow.ts         # Agent glow animation hook
│   │   # Planned: BlockRenderer.tsx, blocks/ — not yet implemented
│   ├── chat/                       # Agent conversation UI
│   │   ├── AgentChat.tsx           # Prompt bar + conversation wiring
│   │   ├── PromptInput.tsx         # Text input with chip system + menu
│   │   ├── PromptInputChip.tsx     # Context item chip (removable)
│   │   ├── PromptInputChips.tsx    # Chip container
│   │   ├── PromptInputMenu.tsx     # Attachment/action menu
│   │   ├── useAgentStream.ts       # SSE stream scaffolding (sendMessage + parseSSEEvent)
│   │   ├── useAutoResize.ts        # Textarea height auto-adjustment
│   │   ├── usePromptInputDrop.ts   # File drag-and-drop onto prompt bar
│   │   ├── usePromptInputState.ts  # Text, context items, active state
│   │   └── imagePreview.ts         # File → data URL utility
│   ├── editor/                     # Rich text editing (Tiptap-based)
│   │   ├── RichEditor.tsx          # Tiptap editor with placeholder + content save
│   │   └── extensions/
│   │       ├── AgentCursor.tsx      # Agent typing indicator (pill cursor + pulse)
│   │       └── MermaidBlock.tsx     # Mermaid diagram rendering as SVG
│   ├── sheet/                      # Full-screen card detail overlay
│   │   ├── FullScreenSheet.tsx     # Bottom sheet with portal + spring animation
│   │   ├── SheetBackdrop.tsx       # Canvas dim overlay with click-to-dismiss
│   │   ├── SheetBody.tsx           # Scrollable content with edge-fade mask
│   │   ├── SheetHeader.tsx         # Close button + action slots
│   │   ├── SheetEntityContent.tsx  # Entity content rendered in sheet
│   │   └── SpaceSheet.tsx          # Wires sheet to space context
│   ├── auth/                       # Authentication UI
│   │   ├── GoogleSignInButton.tsx  # Pill-style OAuth button
│   │   └── LoginSheetContent.tsx   # Login content for sheet/modal
│   ├── ui/                         # Shared primitives (Radix-based)
│   │   └── [button, input, dialog, tooltip, context-menu, sheet, menu-card].tsx
│   ├── entityStore.ts              # Zustand store for entities (CRUD, z-index, focus)
│   ├── sheetStore.ts               # Zustand store for sheet state (open/close, active entity)
│   └── supabase/                   # Supabase client
│       ├── client.ts               # Browser client
│       └── server.ts               # Server client (SSR)
│
├── tokens/                         # Design system
│   ├── seeds.ts                    # Base values (scale, brand hues)
│   ├── palettes.ts                 # Generated color palettes (light + dark)
│   ├── tokens.css                  # Output: CSS custom properties
│   └── tailwind.config.ts          # Maps custom properties → Tailwind classes
│
├── lib/                            # Shared utilities (thin)
│   ├── id.ts                       # ULID generation
│   ├── motion.ts                   # Animation config (spring parameters, duration tiers)
│   └── types.ts                    # Shared TypeScript types
│
├── public/                         # Static assets
├── .env.local                      # Supabase URL + keys
└── package.json
```

### Agent Service (Railway)

```
domus-agent/
├── agent/
│   ├── loop.py                     # The agent loop. Streams tool calls + text via Claude SDK.
│   ├── tools.py                    # 5 tool definitions + executors (create, update, query, read, web_search)
│   ├── context.py                  # Build lightweight system prompt (entity index, not full state)
│   ├── memory.py                   # Compaction (no embeddings — recency + graph + full-text search)
│   ├── image_gen.py                # Gemini image generation (called by tools.py for type='image')
│   └── prompts/
│       └── builder.py              # Composed app builder prompt template (injected by context.py on detection)
│
├── graph/
│   ├── store.py                    # Adjacency list in entities table (type='edge')
│   └── ops.py                      # NetworkX graph operations (traverse, query, reason)
│
├── main.py                         # FastAPI app + SSE endpoint
├── config.py                       # Environment-based config
├── requirements.txt
├── Dockerfile                      # Railway deployment
└── .env                            # API keys, Supabase connection string
```

**Rules:**
- `apps/` has zero imports from other `apps/`. Apps are isolated.
- `core/` never imports from `apps/`. It uses the registry.
- `tokens/` has zero runtime dependencies. It's a build-time pipeline.
- `lib/` is utility only. No business logic. If it's growing, something is wrong.
- The agent service never imports from the frontend. They share nothing except the Supabase database and the entity schema.

---

## Database Schema

```sql
-- 001_init.sql

-- Users (managed by Supabase Auth, this extends the profile)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  username text unique not null,  -- unique handle for user discovery + chat invites
  avatar_url text,
  active_space_id uuid,  -- which space to load on login / current space
  created_at timestamptz default now()
);

-- Spaces
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'My Space',
  focused_entity_id uuid,  -- what the user is currently looking at
  created_at timestamptz default now()
);

-- Space templates (entity blueprints for new spaces)
create table public.space_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  entities jsonb not null,  -- array of entity blueprints: [{ type, state, position, presentation, summary }]
  is_system boolean not null default false,  -- system templates vs user-created (post-v1)
  created_at timestamptz default now()
);

-- Add FK for active_space_id after spaces table exists
alter table public.users
  add constraint users_active_space_id_fkey
  foreign key (active_space_id) references public.spaces(id) on delete set null;

-- Entities (the only table that matters)
-- user_id means "belongs to" (the space owner). Isolation derives from space_id → spaces.user_id.
-- TODO: Consider removing entities.user_id and enforcing isolation purely via space_id join.
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,  -- denormalized from spaces.user_id
  type text not null,
  presentation text not null default 'window',
  position jsonb not null default '{"x": 50, "y": 50, "locked": false}',
  size jsonb not null default '{"width": 600, "height": 400}',
  z_index int not null default 0,
  content text not null default '',  -- markdown body: the human-readable part
  state jsonb not null default '{}',  -- structured data for renderers (only when needed)
  summary text,  -- one-line description, written by whoever last mutated the entity
  created_by text not null default 'user',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index entities_space_id_idx on public.entities(space_id) where not archived;
create index entities_type_idx on public.entities(space_id, type) where not archived;

-- Full-text search index (for agentic search — replaces embeddings/pgvector)
-- Covers both content (markdown body) and summary (one-liner) for comprehensive search
create index entities_fts_idx on public.entities
  using gin (to_tsvector('english', coalesce(content, '') || ' ' || coalesce(summary, '')));

-- Row-Level Security
alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.entities enable row level security;

create policy "users read own profile" on public.users for select using (id = auth.uid());
create policy "users read public profiles" on public.users for select using (true);  -- username, name, avatar are public
create policy "users update own profile" on public.users for update using (id = auth.uid());

create policy "users crud own spaces" on public.spaces for all using (user_id = auth.uid());

-- Current: uses denormalized user_id for fast RLS checks.
-- Correct isolation: should join through space_id → spaces.user_id.
-- TODO: Replace with: using (space_id in (select id from public.spaces where user_id = auth.uid()))
create policy "users crud own entities" on public.entities for all using (user_id = auth.uid());

alter table public.space_templates enable row level security;
create policy "anyone can read system templates" on public.space_templates for select using (is_system = true);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entities_updated_at
  before update on public.entities
  for each row execute function update_updated_at();

-- JSON Merge Patch (RFC 7396) for agent state updates
-- Handles: recursive object merge, null-as-delete, array replacement
create or replace function jsonb_merge_patch(target jsonb, patch jsonb)
returns jsonb as $$
declare
  key text;
  value jsonb;
  result jsonb := target;
begin
  if jsonb_typeof(patch) != 'object' then
    return patch;
  end if;
  for key, value in select * from jsonb_each(patch)
  loop
    if value = 'null'::jsonb then
      result := result - key;
    elsif jsonb_typeof(value) = 'object'
      and jsonb_typeof(result -> key) = 'object' then
      result := jsonb_set(result, array[key], jsonb_merge_patch(result -> key, value));
    else
      result := jsonb_set(result, array[key], value, true);
    end if;
  end loop;
  return result;
end;
$$ language plpgsql immutable;
```

Four tables (users, spaces, space_templates, entities) plus billing tables below. Seven policies. One trigger. One full-text index. One merge function. That's the entire backend data layer. No pgvector, no embeddings — agentic search + full-text search + knowledge graph handle context retrieval.

---

## Billing & Usage Tracking

There is no free tier. All signed-up users are on the **Domus Citizen** plan. Usage is tracked per event type. When a Citizen reaches their allocation, they can purchase **Domus Extra Usage** for additional capacity. Feature gating follows the same pattern as guest mode — the agent communicates limits conversationally, not as error modals.

<!-- TODO: Define Domus Citizen pricing (monthly/annual), exact usage allocations per category, and Extra Usage pricing tiers. -->

```sql
-- 002_billing.sql

-- Extend users with plan info
alter table public.users add column plan text not null default 'citizen';  -- 'citizen' | 'citizen_extra'
alter table public.users add column stripe_customer_id text unique;  -- created on first Stripe Checkout
alter table public.users add column plan_period_start timestamptz;
alter table public.users add column plan_period_end timestamptz;

-- Usage events
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  event_type text not null,  -- 'agent_turn' | 'image_generation' | 'image_edit' | 'file_processing' | 'web_search'
  tokens_used int,           -- LLM tokens consumed (nullable, not all events use tokens)
  created_at timestamptz not null default now()
);

create index usage_events_user_period_idx on public.usage_events(user_id, created_at);

-- RLS
alter table public.usage_events enable row level security;
create policy "users read own usage" on public.usage_events for select using (user_id = auth.uid());
-- Only the agent service inserts usage events (via service role key), not users directly.
```

**Feature gating:** The agent service checks usage before executing tool calls. When a Domus Citizen approaches or hits their allocation, the agent communicates it conversationally in chat — same pattern as the guest mode feature gate. The user can still browse, open entities, and interact with existing content. Creation and generation are gated. The agent offers Extra Usage inline.

<!-- TODO: Define exact token and document processing thresholds for Citizen allocation and guest mode limit. -->

**Usage categories:**

| Event type | What counts | Tracked by |
|---|---|---|
| `agent_turn` | Each agent loop invocation | Agent service (per request) |
| `image_generation` | Each Gemini generate call | `tools.py` (on image create) |
| `image_edit` | Each Gemini edit call | `tools.py` (on image update) |
| `file_processing` | Each file sent to Claude for parsing | `tools.py` (on file entity process) |
| `web_search` | Each Perplexity API call | `tools.py` (on web_search) |

**Billing dashboard:** The usage dashboard is a sidebar panel entity. The agent can open it via `create_entity(type='billing_dashboard', presentation='sidebar')`, or the user can access it from the App Dock. It reads from the `usage_events` table and the user's plan info.

**Payment integration (Stripe):**

Stripe handles all payment processing. No custom billing logic.

- **Domus Citizen subscription:** A single Stripe Product with monthly and annual Price objects. Checkout via Stripe Checkout (hosted page — no custom payment form). Subscription management via Stripe Customer Portal (cancel, update payment method, view invoices).
- **Domus Extra Usage:** A separate Stripe Product purchased as a one-time payment when a Citizen hits their allocation. The agent offers it conversationally; clicking the link opens Stripe Checkout.
- **Webhook flow:** Stripe sends events to a Next.js API route (`/api/webhooks/stripe/route.ts`). Key events: `checkout.session.completed` (activate plan), `invoice.paid` (renew), `customer.subscription.deleted` (downgrade). The webhook handler updates `users.plan`, `plan_period_start`, `plan_period_end` in Supabase.
- **User ↔ Stripe mapping:** `users` table gets a `stripe_customer_id` column. Created on first checkout. All Stripe operations reference this ID.
- **No Stripe SDK on the frontend.** Checkout and portal use Stripe-hosted pages (redirect flow). The frontend calls Next.js API routes that create Checkout Sessions or Portal Sessions server-side.

<!-- TODO: Define Domus Citizen pricing (monthly/annual), exact usage allocations per category, and Extra Usage pricing tiers. -->

---

## Open Questions — User Isolation

These are unresolved design questions about user isolation that need answers before implementation.

**1. Agent service & RLS: how does the agent authenticate to Supabase?**
The agent service creates/reads entities on behalf of users. RLS policies check `auth.uid()`. Options:
- **Service role key (bypasses RLS):** Simple, but a leaked key gives unrestricted access to all data. The "defense-in-depth" claim weakens.
- **Per-request user impersonation:** Set a request-scoped `auth.uid()` on each query (Supabase supports this via `SET LOCAL role` + custom claims). Preserves RLS but adds complexity.
- Decision needed before first agent service implementation.

**2. Does RLS apply to Supabase Realtime subscriptions?**
CDC on the entities table powers realtime updates. Supabase Realtime can respect RLS, but it requires explicit configuration (`REPLICA IDENTITY FULL` + RLS-enabled channels). If not configured, a user could theoretically subscribe to another user's entity changes. Needs verification during Supabase project setup.

**3. `usage_events` INSERT path.**
The RLS policy on `usage_events` is SELECT only. The comment says "only the agent service inserts via service role key." This is correct if we go with service role for the agent, but it's coupled to the decision in question #1. No user-facing INSERT policy should be added — usage tracking is a trusted server-side concern.

---

## Knowledge Graph

Entities can relate to each other. Relationships are stored as entities themselves (type `'edge'`), forming an adjacency list in the same table:

```
Entity (type='edge'):
  state: {
    source_id:    uuid      # from entity
    target_id:    uuid      # to entity
    relation:     text      # 'related_to' | 'belongs_to' | 'references' | 'derived_from' | ...
    weight:       float     # 0.0 - 1.0, strength of relationship
    metadata:     jsonb     # optional, relation-specific data
  }
  presentation: 'hidden'
  created_by:   'agent'     # agent discovers and creates relationships
```

**Why this approach:**
- Zero new tables. Edges are entities. They flow through the same Realtime CDC, the same RLS, the same archival logic.
- The agent creates edges using the same `create_entity` tool — no new tool surface.
- `query_entities` with `type='edge'` retrieves the graph.

**Graph operations** run in the Python agent service using NetworkX:

```python
# graph/ops.py — loaded on-demand from edge entities

import networkx as nx

def build_graph(edges: list[dict]) -> nx.DiGraph:
    G = nx.DiGraph()
    for e in edges:
        s = e["state"]
        G.add_edge(s["source_id"], s["target_id"],
                   relation=s["relation"], weight=s["weight"])
    return G

def related_entities(G: nx.DiGraph, entity_id: str, depth: int = 2) -> list[str]:
    """BFS traversal up to depth. Returns connected entity IDs."""
    return list(nx.single_source_shortest_path(G, entity_id, cutoff=depth).keys())

def find_clusters(G: nx.DiGraph) -> list[set[str]]:
    """Find strongly connected clusters of entities."""
    return [c for c in nx.strongly_connected_components(G) if len(c) > 1]
```

The agent uses the graph to enrich context: "what entities are related to what the user is asking about?" The graph provides structural relationships (explicit connections the agent has created), complementing full-text search and recency-based retrieval. The agent queries edges on demand via `query_entities(type='edge')` — graph context is not pre-loaded into the system prompt.

---

## Model Integration

The agent loop uses the Anthropic Python SDK directly. No provider abstraction for v1.

**Why no abstraction:** Claude and Gemini have fundamentally different tool-calling semantics (UUID-based vs. name-based linking, mandatory thought signatures in Gemini 3, different streaming models). Building a correct abstraction requires handling both models' edge cases — complexity that doesn't pay off until we actually need multi-model support. Start with one model, do it well.

**Claude (Anthropic) — the agent's brain:**
- Sonnet for interactive turns (fast, cheap, reliable tool use)
- Opus for memory compaction (better at summarization and reasoning over long context)
- Direct `anthropic` SDK usage — `client.messages.stream()` with tool definitions

**Gemini (Google) — image generation only:**
- Model: `gemini-2.5-flash-image` (production/GA, $0.039/image, 1024x1024 max)
- Uses `google-genai` Python SDK (`client.models.generate_content()`)
- Called as a backend service from `tools.py` — not part of the agent loop
- Returns inline binary data (raw bytes) — no URLs. We upload to Supabase Storage.
- Post-v1: `gemini-3-pro-image-preview` for upscaling features (up to 4K, $0.035-$0.24/image)

**Image generation: three intents**

Claude decides the intent from conversation context. Gemini receives a single-shot call each time.

| Intent | Trigger | Gemini call |
|---|---|---|
| **Generate** | `create_entity(type='image', state={ generation_prompt: "..." })` | `generate_content([prompt])` — text only |
| **Edit** | `update_entity(id, state={ edit_prompt: "..." })` | `generate_content([edit_prompt, current_image])` — text + image |
| **Inspire** | `create_entity(type='image', state={ generation_prompt: "...", reference_entity_ids: [...] })` | `generate_content([prompt, ref_image_1, ref_image_2, ...])` — text + reference images |

**Why single-shot, not Gemini chat sessions:** Gemini's chat API is a convenience wrapper around `generate_content()` — it replays full history each call with no hidden server-side state. Claude already manages conversation context and constructs rich prompts that include original generation context and editing history. A Gemini chat session would add state management complexity that contradicts "all state lives in entities."

**Claude as context manager for multi-turn editing:** Claude reads the image entity's state (which includes `generation_prompt`, `edit_history`, `edit_count`) and constructs a precise edit prompt for Gemini. For successive edits, Claude includes context like "This image depicts [original description]. Previous edits: [history]. Now: [new instruction]. Keep everything else exactly the same." After ~5 edits (cumulative quality degradation from re-encoding), Claude can regenerate from scratch with a comprehensive prompt.

**Image entity state schema:**
```
{
  image_url:             string    — Supabase Storage path
  generation_prompt:     string    — original creation prompt
  created_via:           string    — 'generation' | 'edit' | 'inspiration'
  edit_history:          string[]  — ordered list of edits applied
  edit_count:            number    — quick check for degradation threshold
  source_entity_id:      string?   — the entity that was edited (for edits)
  reference_entity_ids:  string[]? — source images used as reference (for inspiration)
  mime_type:             string    — default 'image/png'
}
```

**Pipeline (all in-memory, no disk I/O):**
```
Supabase Storage → download bytes → BytesIO → PIL Image.open()
  → Gemini generate_content([prompt, image]) → response.parts[0].as_image()
  → PIL Image → BytesIO → Supabase Storage upload → store URL in entity state
```

**File processing (Claude PDF parsing):** When a user uploads a file (drag-and-drop onto canvas), the frontend uploads to Supabase Storage and creates a file entity. The agent service downloads the file bytes and sends them to Claude as a document content block — Claude natively parses PDFs, images, and common document formats. The agent extracts structured information and creates entities from it (e.g., a W-2 PDF → a note entity with extracted fields). The original file stays in Supabase Storage, linked to the extracted entities via edges.

**Pipeline:**
```
User drops file → frontend uploads to Supabase Storage → creates file entity →
agent reads file entity → downloads bytes from Storage → sends to Claude as document block →
Claude extracts structured data → agent creates note entities from extracted content →
agent creates edge entities linking notes to original file
```

**Post-v1:** If multi-model support becomes necessary, introduce a provider abstraction at that point. The key adapter challenges to plan for: Gemini's mandatory thought signatures (encrypted opaque tokens that must be preserved across turns), name-based tool result linking (vs. Claude's UUID-based), and different streaming semantics.

---

## App Contract

The registry describes all renderable types — both built-in apps (custom components in `apps/`) and composed apps (agent-generated, rendered by the generic block renderer). Every type has a registry entry; the entry kind determines how it renders.

```typescript
// apps/_types.ts

import { z } from 'zod'
import { ComponentType } from 'react'

// Unified type — every renderable entity type has one of these
export type AppType = BuiltInApp | ComposedApp

// Built-in: custom component in apps/, file-based auto-discovery
export type BuiltInApp<
  TState extends z.ZodObject<any> = z.ZodObject<any>,
  TActions extends Record<string, z.ZodObject<any>> = Record<string, z.ZodObject<any>>,
> = {
  source: 'built-in'
  type: string                                    // unique identifier, matches entity.type
  name: string                                    // human-readable display name
  icon: ComponentType                             // icon component (lucide-react or similar)
  component: ComponentType<AppProps<z.infer<TState>>>  // the React UI

  defaultPresentation: 'window' | 'card' | 'sidebar'
  defaultSize: { width: number; height: number }
  maxInstances?: number                           // max entity instances per space (undefined = unlimited, 1 = singleton)

  // Schema — what the agent can see about this app type
  schema: {
    state: TState                                 // shape of entity.state for this type
    actions: TActions                             // named actions for user interactions
  }

  // Frontend-only: (current state, action name, params) → new state
  // Used for direct user interactions (clicks, typing, dragging).
  // The agent does NOT use reducers — it writes raw state directly.
  reduce: (state: z.infer<TState>, action: string, params: any) => z.infer<TState>

  // Frontend-only: generates a one-line summary when the user changes state.
  // The agent writes its own summaries when it creates/updates entities.
  // Both write to the entity's `summary` column — readers never compute summaries.
  summarize: (state: z.infer<TState>) => string
}

// Composed: agent-generated, rendered by BlockRenderer. Metadata only.
// Derived from entity data at runtime — not persisted separately.
export type ComposedApp = {
  source: 'composed'
  type: string                                    // entity.type (e.g., 'habit-tracker', 'comparison')
  label: string                                   // from state.label of first entity of this type
  defaultPresentation: 'window' | 'card' | 'sidebar'
  defaultSize: { width: number; height: number }
  blockSummary: string                            // e.g., "heading, checklist (5 items), progress"
  // component → always BlockRenderer (implied by source, not stored)
  // reduce → always blockReducer (implied by source, not stored)
  // summarize → always blockSummarizer (implied by source, not stored)
}

export type AppProps<TState> = {
  entityId: string
  state: TState
  dispatch: (action: string, params: any) => void  // calls reduce → writes state + summary to Supabase
}
```

**Singleton apps (`maxInstances: 1`):** Some built-in apps — chat, calendar — allow only one instance per space. Opening a singleton from the App Dock reveals the existing hidden entity rather than creating a new one. If no entity exists yet, one is created. Close (X) hides it (`presentation: 'hidden'`); reopening shows the same instance. The agent respects this constraint — `create_entity` for a singleton type that already exists returns the existing entity instead of creating a duplicate.

**Two write paths, one table:**
- **User interacts** → `dispatch(action, params)` → reducer computes new state → `summarize()` generates summary → both written to Supabase
- **Agent acts** → `update_entity` tool writes raw state + summary directly to Supabase → no reducer involved

Both paths end up writing to the same entities table. CDC syncs all clients.

**Auto-discovery (built-in apps):**

```typescript
// apps/_registry.ts — built-in apps from file-based auto-discovery
const builtInModules = import.meta.glob('./*/index.ts', { eager: true })

export const builtInApps: Record<string, BuiltInApp> =
  Object.fromEntries(
    Object.values(builtInModules).map((m: any) => [m.default.type, m.default])
  )
```

**Composed app derivation (runtime):**

Composed app entries are derived from entity data — not persisted separately. When the entity store loads a space's visible entities, it derives `ComposedApp` entries for any entity types that aren't in the built-in registry and have `state.blocks`:

```typescript
// apps/_registry.ts — composed apps derived from entity store
function deriveComposedApps(entities: Entity[]): Record<string, ComposedApp> {
  // Group entities by type
  // Filter: type NOT in builtInApps AND entity has state.blocks
  // For each group: create ComposedApp from first entity's metadata (state.label, presentation, size)
  // Include blockSummary: summarize block types + counts (e.g., "heading, checklist (5 items), progress")
}

// Unified lookup — built-in takes priority
export function getAppType(type: string): AppType | undefined {
  return builtInApps[type] ?? composedApps[type]
}
```

Composed entries update when new entities arrive via SSE (a new type with `state.blocks` adds an entry immediately). If all entities of a composed type are archived, the entry disappears — it's derived, not authoritative.

**Promotion path:** To promote a composed app to built-in: create an `apps/{type}/` folder with a custom component, reducer, and summarizer. On next build, `import.meta.glob` picks it up as a `BuiltInApp`. The type name carries over — existing entities automatically render with the new custom component. No migration needed.

**Schema endpoint:** App schemas are served as JSON via a Vercel API endpoint (`GET /api/schemas`). For built-in apps: the route imports the registry, converts each app's Zod state schema to JSON Schema (via Zod v4's built-in `z.toJSONSchema()`). For composed apps: serves the shared block schema (valid block types and their required fields). The Python agent service fetches schemas from this endpoint on startup and caches them in-memory.

---

## Agent Design

### System Prompt Structure (Lightweight — Agentic Search)

The system prompt is thin. The agent discovers details on demand via tool calls.

```
You are the Domus assistant. You help users by creating and managing entities in their space.
You communicate with users through your natural text output — no tool call needed to respond.

## Your Tools
- create_entity: Create any entity in the space (notes, calendar events, images, etc.)
- update_entity: Patch an entity's state, position, size, or presentation directly
- query_entities: Search/filter entities — returns lightweight summaries (id, type, summary)
- read_entity: Get one entity's full state by ID

## Relevant App Types
{only types relevant to the current turn — 1-3 types, not all}
  ### {app.name} (type: "{app.type}", built-in)
  State: {JSON schema of app.schema.state}
  ### {composed.label} (type: "{composed.type}", composed)
  Blocks: {composed.blockSummary}

## Space Index
{for each non-archived entity (including hidden, so agent knows about docked/hidden items):}
  - [{entity.id}] {entity.type} ({entity.presentation}, z:{entity.z_index}) — {entity.summary}
{end}

## Personality
{all personality_trait entities — always included}

## Recent Turns
{last 3-5 conversation turns for continuity — not 10}
```

**Dynamic schema discovery:** The context builder (`context.py`) injects only schemas for app types that are likely relevant to this turn. Relevance is determined by: (1) app types mentioned in the user's message, (2) types of currently visible entities. If the agent needs a schema it doesn't have, it can query for entities of that type to discover it.

**Composed app context parity:** Composed types get the same system prompt treatment as built-in types. `context.py` derives a block summary from entity data (block types + counts, not full content) and includes it in the "Relevant App Types" section. This means the agent knows the structural shape of a composed type (e.g., "heading, checklist (5 items), progress") without needing a `read_entity` call — same level of awareness as built-in schemas.

**What's NOT in the system prompt:**
- Full entity content and state (agent uses `read_entity` to load details on demand)
- Graph edges (agent queries `type='edge'` when exploring relationships)
- Conversation summaries (agent queries for them when it needs historical context)
- Facts (agent queries for them when it needs to recall learned information)
- All app schemas (only relevant ones injected; agent discovers others via tool calls)

### Tool Definitions

```python
# agent/tools.py

tools = [
    {
        "name": "create_entity",
        "description": "Create a new entity in the space. Use this to open apps, create notes, generate images, or add any content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "description": "The app type (e.g., 'calendar', 'note', 'image')"},
                "presentation": {"type": "string", "enum": ["window", "card", "sidebar", "hidden"], "default": "window"},
                "position": {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}}},
                "size": {"type": "object", "properties": {"width": {"type": "number"}, "height": {"type": "number"}}},
                "content": {"type": "string", "description": "Markdown body. Use for notes, research, articles, descriptions — any human-readable text."},
                "state": {"type": "object", "description": "Structured data for renderers. Use only when a component needs typed fields (dates, URLs, datasets). Most entities need only content."},
                "summary": {"type": "string", "description": "One-line description of the entity"},
            },
            "required": ["type"],
        },
    },
    {
        "name": "update_entity",
        "description": "Update an existing entity. Writes state directly (no reducer). State uses RFC 7396 JSON Merge Patch. Content is full replacement (not merged).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entity ID"},
                "content": {"type": "string", "description": "New markdown body (full replacement, not merged)"},
                "state": {"type": "object", "description": "Partial state (RFC 7396 merge patch). Provided fields overwrite, omitted fields preserved, null deletes, arrays replaced entirely."},
                "summary": {"type": "string", "description": "Updated one-line description"},
                "position": {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}}},
                "size": {"type": "object", "properties": {"width": {"type": "number"}, "height": {"type": "number"}}},
                "presentation": {"type": "string", "enum": ["window", "card", "sidebar", "hidden"]},
            },
            "required": ["id"],
        },
    },
    {
        "name": "query_entities",
        "description": "Search and list entities in the space. Returns lightweight summaries (id, type, summary). Use read_entity to get full state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "description": "Filter by entity type"},
                "search": {"type": "string", "description": "Full-text search query across entity summaries"},
                "presentation": {"type": "string", "description": "Filter by presentation mode"},
                "created_after": {"type": "string", "description": "ISO date — entities created after this date"},
                "created_before": {"type": "string", "description": "ISO date — entities created before this date"},
                "include_archived": {"type": "boolean", "default": False},
                "limit": {"type": "number", "default": 20},
            },
        },
    },
    {
        "name": "read_entity",
        "description": "Get a single entity's full content and state by ID. Returns markdown content + structured state. Use after query_entities to load details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entity ID to read"},
            },
            "required": ["id"],
        },
    },
    {
        "name": "web_search",
        "description": "Search the web for current information. Returns sourced answers with citations. Use for research, fact-finding, and any query requiring external knowledge.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"},
            },
            "required": ["query"],
        },
    },
]
```

**Reminders & notifications:**

Reminders are calendar entities with a reminder flag in state. When a reminder's time arrives and the user is not active in Domus, an email notification is sent. In-app, the agent surfaces upcoming reminders when the user opens the space. Email is the only external notification channel for v1 — no push notifications, no SMS.

**Composed apps (agent-generated):**

Not all app types are built-in. The agent creates new app types on the fly using **declarative composition** — it writes a block-based spec as entity state, and a generic block renderer interprets it. No code generation, no eval, no sandbox. The agent composes from a fixed library of primitives.

The agent creates entities with any type name (`dashboard`, `checklist`, `travel-plan`, `comparison`, etc.). These are registered in the unified registry as `ComposedApp` entries — derived from entity data at runtime. `AppRenderer` dispatches to the block renderer for all composed types. This is the extensibility model: the agent builds what you need from composable primitives, rather than shipping every possible app type.

**Composed entity state schema:**
```
{
  label:    string     — display name shown in window/card chrome
  blocks:   Block[]    — ordered array of primitives
}
```

**Block primitive library (v1):**

| Category | Block type | Key fields | Notes |
|----------|-----------|------------|-------|
| **Content** | `heading` | `text`, `level` (1–3) | |
| | `text` | `content` (markdown string) | Rendered via react-markdown |
| | `list` | `items: string[]`, `ordered: boolean` | |
| | `divider` | — | |
| | `callout` | `text`, `variant` (info / warning / success / error) | |
| **Media & Files** | `image` | `url`, `alt?`, `caption?` | URL points to Supabase Storage |
| | `file` | `url`, `filename`, `mimeType`, `size?` | Supabase Storage reference. Renders as file card (image preview for images, download link for others). User can upload to this block. |
| **Data** | `table` | `columns: string[]`, `rows: string[][]` | |
| | `key-value` | `pairs: { label, value }[]` | |
| | `stat` | `label`, `value`, `trend?`, `trendDirection?` (up / down / neutral) | |
| | `progress` | `label`, `value: number`, `max: number` | |
| | `chart` | `chartType` (bar / line / pie), `labels: string[]`, `datasets: { label, data: number[], color? }[]` | Rendered via recharts |
| **Interactive** | `checklist` | `items: { text, checked }[]` | Toggle writes to entity state |
| | `toggle` | `label`, `checked: boolean` | Toggle writes to entity state |
| **Input** | `text-input` | `label`, `value: string`, `placeholder?` | Persists user-entered text to entity state |
| | `number-input` | `label`, `value: number`, `min?`, `max?`, `step?` | |
| | `date-input` | `label`, `value: string` (ISO), `includeTime?: boolean` | |
| | `select` | `label`, `value: string`, `options: string[]` | |
| **Reference** | `entity-ref` | `entityId: string`, `label?` | Renders as clickable chip/card showing referenced entity's type + summary. Clicking opens/focuses that entity. |
| **Layout** | `columns` | `children: Block[][]` | Array of column arrays |
| | `section` | `title`, `children: Block[]` | Titled group of blocks |

**Interaction model:** Interactive blocks (checklist, toggle) and input blocks (text-input, number-input, date-input, select) mutate entity state directly — the block renderer is the reducer. When a user checks an item, the renderer updates `state.blocks[i].items[j].checked` and writes to Supabase. No per-app reducer needed. The agent can also update any block via `update_entity`. File blocks support user upload — the frontend uploads to Supabase Storage and updates the block's `url`/`filename`/`mimeType` fields in entity state. Entity-ref blocks are read-only — clicking opens the referenced entity.

**Rendering dispatch in AppRenderer (single path):**
```
AppRenderer receives entity.type
  → getAppType(entity.type) from unified registry
  → BuiltInApp? → render app.component
  → ComposedApp? → render BlockRenderer
  → not found + state.blocks exists? → render BlockRenderer (first-encounter fallback)
  → not found + no blocks? → render fallback error card
```

Step 3 (first-encounter fallback) handles the race condition where SSE delivers a new entity before the registry has derived its composed entry. The registry catches up on the next tick. This is the only case where rendering bypasses the registry — and it's transient.

**Summarization:** A generic summarizer auto-generates summaries from blocks (e.g., "Checklist: 3/5 completed", "Dashboard with 4 sections"). The agent can also write custom summaries via `update_entity`.

**Block schema validation (`tools.py`):** Every `create_entity` and `update_entity` with `state.blocks` validates each block against its type's required fields. Returns specific errors: `"Block 3 (chart): missing required field 'datasets'"`. The agent sees the error in the tool result and can fix + retry within the same turn. Referential checks: entity-ref `entityId` must exist in the space, file `url` must be a valid Supabase Storage path.

**Agent iteration protocol (no new tools):** The existing tool loop supports multi-pass composition. The agent builds complex composed apps iteratively:
1. **Plan** — Claude's reasoning decides what blocks to create
2. **Execute** — `create_entity` with initial blocks
3. **Verify** — `read_entity` to check what was created
4. **Extend** — `update_entity` with the full updated blocks array (arrays are replaced per RFC 7396, so agent does read-modify-write to append)
5. **Loop** — repeat verify/extend until complete

This is the existing `while True` agent loop — no new tools, no new infrastructure.

**Builder prompt injection (`context.py`):** The builder prompt is NOT in the base system prompt. It's injected on detection, following the same pattern as dynamic schema discovery. Detection triggers:

| Trigger | Action |
|---------|--------|
| User message implies creating a non-built-in type | Inject builder prompt |
| Focused entity has `state.blocks` (user looking at a composed app) | Inject builder prompt |
| Neither condition | No injection — system prompt stays thin |

The builder prompt contains: block primitive reference (all types + required fields), iteration protocol (create → read → verify → extend), validation rules, and a compact example of a well-formed composed app. Lives as a static template in the agent service (`agent/prompts/builder.py`), loaded by `context.py` on detection. ~30-40 lines of focused context, injected only when needed.

**Frontend defensive rendering:** Unknown or malformed blocks render an error placeholder — not a crash. The existing Error Boundary at the `AppRenderer` level catches render failures and shows a fallback card.

**No `respond` tool.** The agent communicates through its natural text output, which streams to the frontend via SSE as text deltas. Text output is saved as a `conversation_turn` entity after the turn completes.

**Web search (Perplexity API):** The `web_search` tool calls the Perplexity API (`POST https://api.perplexity.ai/chat/completions`) from `tools.py`. Perplexity returns sourced answers with citations — the agent uses these to create entities with researched content. The agent decides when to search based on conversation context (e.g., user asks about coworking spaces, competitor analysis, factual questions). Search results are ephemeral — the agent creates entities from the results, not from the raw API response.

**Update semantics:**
- `content`: full replacement. Agent sends the complete markdown string. No merge — the new value overwrites the old.
- `state`: RFC 7396 JSON Merge Patch. Provided scalar fields overwrite. Provided objects merge recursively. `null` deletes a key. Arrays are always replaced entirely. Omitted fields preserved.
- Frontend writes full state replacement (no merge). Agent writes partial state via `jsonb_merge_patch()` in Postgres.
- Concurrency: last-write-wins for v1. Optimistic locking via `version` column can be added post-v1 if needed.

**Validation:** `tools.py` validates entity state against the app's JSON schema (fetched from Vercel's `/api/schemas` endpoint) before writing to Postgres. If the agent sends malformed state, the tool returns an error and the agent can retry. The frontend renders defensively — each `<AppRenderer>` wraps the app component in a React Error Boundary that catches render errors and shows a fallback card with entity type, summary, and a "retry" button.

### Agent Loop

```python
# agent/loop.py

import anthropic

client = anthropic.AsyncAnthropic()

async def run_agent(
    space_id: str,
    user_id: str,
    message: str,
    on_event: Callable[[dict], Awaitable[None]],
):
    system = await build_lightweight_prompt(space_id, message)
    history = await get_recent_history(space_id, user_id, limit=5)
    messages = [*history, {"role": "user", "content": message}]

    await save_conversation_turn(space_id, user_id, "user", message)

    while True:
        tool_calls = []
        assistant_text = ""

        async with client.messages.stream(
            model="claude-sonnet-4-5-20250929",
            system=system,
            messages=messages,
            tools=tool_definitions,
            max_tokens=4096,
        ) as stream:
            async for event in stream:
                await on_event(event)  # SSE to frontend
                # Collect tool calls and text from the stream

        response = await stream.get_final_message()
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            break

        # Execute tool calls (parallel — they're independent)
        results = await asyncio.gather(*[
            execute_tool(tc.name, tc.input, space_id, user_id)
            for tc in tool_use_blocks
        ])

        # Build tool results in Claude's expected format
        messages.append({"role": "assistant", "content": response.content})
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tc.id,
                    "content": json.dumps(r),
                }
                for tc, r in zip(tool_use_blocks, results)
            ],
        })

    # Save agent response as conversation turn
    await save_conversation_turn(space_id, user_id, "assistant", assistant_text)

    # Compaction check
    turn_count = await count_recent_turns(space_id)
    if turn_count > 40:
        await compact_memory(space_id, user_id)
```

### Error Recovery

| Failure | Behavior |
|---|---|
| **SSE connection drops mid-turn** | Frontend auto-reconnects with exponential backoff. On reconnect, fetches latest entity state from Supabase to reconcile any missed updates. In-flight agent text is lost — the agent's response is incomplete but any committed entity writes persist. |
| **Agent service (Railway) down** | Frontend shows inline error in the chat panel: "Agent is temporarily unavailable." User can still interact with all entities on canvas (drag, type, resize, open sheets). Agent-dependent features (prompt bar submissions) are queued or disabled until reconnect. |
| **Partial tool execution** | Entities already created/updated are committed to Postgres (each tool call is an independent DB write). The agent's turn may be incomplete. On next turn, the agent sees what was already created via the entity index and can continue or clean up. |
| **Supabase Realtime disconnects** | Client reconnects automatically (Supabase client handles this). Missed CDC events are reconciled by a full entity fetch on reconnect. |

The entire agent. Uses the Anthropic SDK directly — no abstraction layer. The `on_event` callback streams text deltas and tool call indicators to the frontend via SSE. When a tool call creates or updates an entity, the result (including the entity data) flows back through SSE, so the frontend can apply the change immediately without waiting for CDC.

### Concurrent Agent Turns

Modeled after Claude Code's design. The agent does not stop when the user sends a new message mid-turn.

| Scenario | Behavior |
|---|---|
| User sends message while agent is **idle** | Normal turn: agent processes and responds |
| User sends message while agent is **working** | Message is queued. Delivered to agent after current tool call completes. Agent incorporates into its plan. |
| User sends "stop" / "cancel" | Current streaming response is terminated. In-flight tool calls are abandoned (committed DB writes persist). Agent receives cancellation notice. |
| User sends modification ("also change...") | Delivered as follow-up. Agent adds to or modifies its current plan without restarting. |

The FastAPI endpoint manages a per-space message queue. The agent loop checks for new queued messages between tool call cycles (between iterations of the `while True` loop). This allows the agent to absorb new instructions without losing progress on the current task.

<!-- TODO: Rate limiting — implement per-user token bucket at the Vercel proxy level for guest mode and Domus Citizen token/document consumption thresholds. Define exact numbers. Enforce before requests hit Railway. -->

---

## Memory System

Memory is not a separate system. It's entities with `presentation: 'hidden'`.

**Entity types used for memory:**

| type | purpose |
|---|---|
| `conversation_turn` | A single user or assistant message |
| `conversation_summary` | Compressed summary of N turns |
| `fact` | Something the agent learned about the user |
| `personality_trait` | How the agent should behave |
| `edge` | Relationship between two entities (knowledge graph) |

**Context retrieval (agentic — not pre-loaded):**

The system prompt includes only personality traits and the last 3-5 conversation turns for continuity. Everything else is retrieved on demand:

- The agent calls `query_entities(type='fact', search='...')` when it needs to recall learned information
- The agent calls `query_entities(type='conversation_summary')` when it needs historical context
- The agent calls `query_entities(type='edge')` when exploring relationships between entities
- Full-text search on the `summary` column handles keyword-based retrieval
- No embeddings, no vector search — recency + full-text search + knowledge graph

**Compaction** (triggered when turn count exceeds threshold):

1. Take turns beyond the recent window (the ones that rolled out)
2. Call Opus with: "Summarize this conversation segment. Extract any facts about the user."
3. Create a `conversation_summary` entity with the summary
4. Create `fact` entities for any new facts
5. Create `edge` entities for any relationships discovered between entities
6. Mark the original turns as `archived: true`

**Global facts (cross-space preferences):**

Facts are normally scoped to a space. Global facts — preferences that apply across all spaces (theme, accent color, display name preferences) — are stored on the `users` table directly or as fact entities in a dedicated user-level context. The agent checks both space-scoped facts and global user facts when building context.

| Scope | Storage | Example |
|---|---|---|
| Per-space | `fact` entity in that space | "Use bullet points for notes in this space" |
| Global (cross-space) | `users` table columns or user-level facts | "Dark mode, orange accent", "Prefers metric units" |

No Mem0. No separate vector store. No embeddings. The entities table with full-text search IS the memory system.

---

## UI Architecture

### SpaceRenderer (the one component that matters)

```tsx
function SpaceRenderer({ spaceId }: { spaceId: string }) {
  // Store holds only visible entities (window, card, sidebar) — not hidden ones.
  // Hidden entities (memory, edges, facts) stay in Postgres, accessed by the agent directly.
  const entities = useEntityStore(s =>
    Object.values(s.entities)
  )

  return (
    <div className="fixed inset-0 bg-surface">
      {/* Canvas — inset card, the space's visual container */}
      <div className="absolute inset-3 rounded-2xl bg-surface-sunken overflow-hidden">
        {/* App Dock */}
        <AppDock>
          {entities
            .filter(e => e.presentation === 'sidebar')
            .map(e => <SidebarPanel key={e.id} entity={e} />)}
        </AppDock>

        {/* Entity layer */}
        <main className="relative w-full h-full">
          {/* Cards */}
          {entities
            .filter(e => e.presentation === 'card')
            .map(e => <CanvasCard key={e.id} entity={e} />)}

          {/* Windows */}
          {entities
            .filter(e => e.presentation === 'window')
            .map(e => (
              <Window key={e.id} entity={e}>
                <AppRenderer type={e.type} state={e.state} entityId={e.id} />
              </Window>
            ))}
        </main>

        {/* Agent chat — always visible */}
        <AgentChat spaceId={spaceId} />
      </div>
    </div>
  )
}
```

### Window chrome

The window component handles: drag (onPointerDown/Move/Up → sets `position.locked: true` with pixel coords), resize (corner handles), close (sets `presentation: 'hidden'` — entity persists, agent can reopen), focus (set highest z_index), and the agent-origin glow (entity.created_by === 'agent' && recently updated). Window has a single close control on the **top left** plus app-specific option buttons on the right. The header is a transparent drag zone with no background — controls float over content. Archiving (soft delete) is a separate action via the context menu — the window close button only hides. This is ~150 lines of well-tested code. No library needed.

### Sheet (card detail view)

The sheet is a full-screen overlay triggered by tapping a card entity. It's not a presentation type — it's a transient viewing/editing mode. The entity stays `presentation: 'card'` in the database.

**Flow:** User taps card → bottom sheet slides up with full entity content → canvas scales down and dims behind it (iOS-style depth) → user views or edits → closes sheet → back to card on canvas.

**Rich text editing** happens inside sheets. When a note card opens in a sheet, the user gets a full rich text editing surface — not the truncated card preview. This is the primary editing surface for long-form content (articles, book chapters, research notes). There is no separate "document window" presentation — rich editing is always card + sheet.

**Sheet is not a presentation type** because it's transient. The entity's persistent state is always one of: `window`, `card`, `sidebar`, `hidden`. The sheet is a UI overlay managed by the SpaceRenderer, not entity state.

See `design-direction.md` → "Bottom Sheet" for the visual specification.

### Realtime sync (two channels)

**SSE (agent changes — primary):** When the agent creates or updates an entity, the tool result includes the entity data. The SSE stream carries it to the frontend. The Zustand store applies it immediately — no waiting for CDC.

**CDC (non-agent changes — secondary):** When the user interacts directly (drag, type, resize), the frontend writes to Supabase. CDC fires and syncs other tabs/sessions.

```typescript
// core/entityStore.ts — CDC subscription (for non-agent changes + confirmation)

function subscribeToSpace(spaceId: string) {
  return supabase
    .channel(`space:${spaceId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'entities',
      filter: `space_id=eq.${spaceId}`,
    }, (payload) => {
      const store = useEntityStore.getState()
      // Filter: only store visible entities (not hidden)
      const entity = (payload.new ?? payload.old) as Entity
      if (entity.presentation === 'hidden') return

      switch (payload.eventType) {
        case 'INSERT':
        case 'UPDATE':
          store.upsert(payload.new as Entity)  // idempotent — may already exist from SSE
          break
        case 'DELETE':
          store.remove(payload.old.id)
          break
      }
    })
    .subscribe()
}
```

**Store scope:** The Zustand entity store holds only visible entities (`presentation: 'window' | 'card' | 'sidebar'`). Hidden entities (memory, edges, facts) are never loaded into the frontend — they live in Postgres and are accessed exclusively by the agent service. The `AgentChat` component manages its own conversation state from the SSE stream + an initial fetch of recent turns.

**Reconciliation:** CDC events also fire for agent-created entities. The store treats all upserts as idempotent (keyed by entity ID). If the entity already arrived via SSE, the CDC event is a no-op.

---

## Design Tokens

Keep the current pipeline concept. It's good. Just simplify the output:

```
seeds.ts          → Base values (type scale, spacing scale, brand hues, radius, elevation)
palettes.ts       → Generate light/dark palettes from seeds using oklch
tokens.css        → Output as CSS custom properties on :root and [data-theme="dark"]
tailwind.config   → Reference custom properties so classes like bg-surface work
```

Theme switching: toggle `data-theme` attribute on `<html>`. Use View Transitions API for the crossfade. This is 10 lines of code.

See `design-direction.md` for the full design system specification.

---

## What We Are NOT Building

Be explicit about scope. These are intentionally out of scope:

- **Custom auth system.** No JWT, no token revocation, no cookie management. Supabase Auth.
- **Custom WebSocket server.** No socket.io, no ws, no custom event protocol. Supabase Realtime.
- **Embeddings / vector search.** No pgvector, no Mem0, no Pinecone, no Weaviate. Agentic search + full-text search + knowledge graph handle context retrieval. Embeddings can be added later if scale demands it.
- **Provider abstraction.** No multi-model routing for v1. Claude direct via the Anthropic SDK. Gemini is used only for image generation as a backend utility. A provider abstraction can be added post-v1.
- **AI framework.** No LangChain, no LlamaIndex. The agent loop is ~60 lines using the Anthropic SDK directly.
- **Separate window/entity/app state management.** One Zustand store holding visible entities only. Hidden entities stay in Postgres.
- **Docker / self-hosted deployment (frontend).** Vercel for frontend, Railway for agent. If we outgrow managed services, we migrate. Not before.
- **Multi-user space collaboration.** v1 scope is single-user spaces — no shared editing, no real-time co-presence on the same canvas. The entity model supports multi-user, but we're not building the collaboration UX yet. **Note:** The chat app (user-to-user messaging) is in scope — that's a chat entity within a user's own space, with messages delivered via Supabase Realtime channels. Chatting with another user is not the same as collaborating in a shared space.
- **Plugin / extension system.** Apps are first-party for now. The folder-drop pattern means adding an app is easy, but there's no third-party plugin API.
- **Mobile web experience.** Domus is desktop-only on the web. Mobile visitors see a "Download Domus on mobile" page. A native iOS app will provide the mobile experience post-v1.
- **Agent proactivity (v1).** Background agents that wake on events (calendar triggers, proactive summaries) and idle-state nudges (agent prompts the user after a period of inactivity) are deferred to post-v1. The agent is reactive only for v1 — it responds when spoken to. Exception: the agent's initial greeting in a new or guest session (Scenario 1) is in scope.

---

## Build Order

These phases are a suggested progression, not a strict plan. The document's primary purpose is to define architecture and decisions that Claude Code agent teams can execute against. Teams may work on phases in parallel or reorder based on priorities.

Phase 1 — **Skeleton**:
1. Next.js project + Supabase project + Railway project + env wiring + `DOMUS_SERVICE_TOKEN`
2. Database migration (core tables + RLS + full-text index + `jsonb_merge_patch` function)
3. Auth (Google sign-in + anonymous auth for guest mode, protected routes, `active_space_id` on users)
4. Space creation from "Starter" template on first sign-in (guest mode: sample space without auth)
5. Entity store (visible entities only) + CDC subscription
6. SpaceRenderer with Window chrome (drag → lock position, resize, close → hide, delete → archive, focus)
7. Bottom sheet component (card → sheet detail/editing flow)
8. One app: notes (text in a card/window, rich text editing in sheet view via Tiptap)

Phase 2 — **Agent**:
1. FastAPI agent service on Railway + `DOMUS_SERVICE_TOKEN` auth
2. Agent loop using Anthropic SDK directly (5 tools + SSE streaming)
3. SSE proxy in Next.js API route (context stack: space_id, message, viewport, focused_entity_id, visible_entity_ids)
4. App schemas API endpoint (`/api/schemas`) + agent service schema cache
5. AgentChat UI (input + streaming response + tool call indicators)
6. Lightweight system prompt builder (entity index with presentation + z_index, dynamic schema discovery)
7. SSE-based entity sync (agent changes applied immediately from SSE, CDC confirms)
8. Concurrent turn handling (message queue, mid-turn instructions, cancellation)
9. Web search tool (Perplexity API integration)

Phase 3 — **Knowledge Graph**:
1. Edge entities + NetworkX ops
2. Agent discovers and creates relationships via create_entity(type='edge')
3. Agent queries graph on demand via query_entities(type='edge')
4. Folder entities for visual grouping (type='folder', children linked via edges)

Phase 4 — **Apps** (one at a time):
1. Calendar (schema + reducer + component)
2. Image generation (Gemini 2.5 Flash Image — generate, edit, inspire intents from tools.py)
3. Files (drag-and-drop upload to Supabase Storage, Claude PDF parsing for extraction)
4. Chat/messages (user-to-user messaging via Supabase Realtime channels)
5. Each app is independent. Build, test, ship separately.

Phase 5 — **Memory**:
1. Conversation turns as hidden entities
2. Compaction (Opus summarizes old turns, extracts facts)
3. Full-text search in query_entities tool
4. Fact and personality_trait extraction
5. Agent retrieves memory on demand via tool calls

Phase 6 — **Billing & Usage**:
1. Billing migration (usage_events table, plan columns on users)
2. Usage tracking in agent service (log events on each tool call)
3. Feature gating (agent checks usage before tool execution, communicates limits conversationally)
4. Guest mode feature gate (N interactions before sign-in required)
5. Billing dashboard entity (sidebar panel, reads usage_events)
6. Payment integration (Stripe — plan tiers, upgrade flow)

Phase 7 — **Polish**:
1. Design tokens pipeline + theme switching
2. Canvas arrangement (auto-layout, folder grouping)
3. Onboarding flow (sample space content, agent welcome message)
4. Performance (lazy loading apps, optimistic updates, viewport culling, pagination)

---

## Decision Log

Decisions made in this document and why. Update this as we go.

| # | Decision | Rationale | Date |
|---|---|---|---|
| 1 | Supabase over custom backend | Auth + Realtime + RLS in one service. Eliminates ~40% of custom infrastructure. | 2026-02-12 |
| 2 | Single entities table | Unified model means 4 agent tools instead of 15. Every new app type is a new `type` value, not a new table. | 2026-02-12 |
| 3 | Tailwind over CSS modules | Faster development. Token pipeline outputs CSS custom properties either way. Tailwind just consumes them. | 2026-02-12 |
| 4 | Vercel for frontend | Agent SSE works with streaming responses. Pro plan gives 300s timeout. Revisit only if we hit limits. | 2026-02-12 |
| 5 | Entity-based memory over external store | Conversation history, facts, personality traits are all entities. One table, one query pattern. | 2026-02-12 |
| 6 | Supabase over GCloud for infrastructure | 3x cheaper at every scale. Realtime CDC, Auth+RLS integration, Storage — all included. GCloud credits reserved for AI APIs. | 2026-02-13 |
| 7 | Python FastAPI on Railway for agent service | Long-running agent loop needs a persistent process, not serverless. Python gives access to NetworkX, better AI SDK ecosystem. Railway is simple + affordable ($5/mo base). | 2026-02-13 |
| 8 | ~~Multi-model~~ → Claude direct for v1 | Provider abstraction adds complexity that doesn't pay off until multi-model is actually needed. Claude has best-in-class tool use, simplest API (UUID-based linking, no mandatory thought signatures). Gemini used only for image generation as a backend utility. | 2026-02-13 |
| 9 | Knowledge graph: Postgres adjacency list + NetworkX | Edges are entities (type='edge'). No new tables, no new tools. NetworkX for graph ops in the Python agent. Zero infrastructure cost. | 2026-02-13 |
| 10 | No AI framework (LangChain, etc.) | 4 tools + Anthropic SDK direct. The agent loop is ~60 lines. The abstraction cost of a framework exceeds the value. | 2026-02-13 |
| 11 | Sonnet default, Opus for compaction | Sonnet is fast enough for interactive chat. Opus is better for summarization and reasoning over long context. Cost optimization. | 2026-02-12 |
| 12 | No embeddings/pgvector for v1 | Agentic search (lightweight index + tool-driven discovery) replaces pre-loaded context and vector search. Recency + full-text search + knowledge graph covers memory retrieval. Embeddings can be added later if scale demands it. Inspired by Anthropic's "Effective Context Engineering" (Sep 2025). | 2026-02-13 |
| 13 | Agentic search over pre-loaded context | Thin system prompt with entity index. Agent discovers details on demand via query_entities + read_entity. No fat prompts stuffed with every entity's full state. More tool calls per turn, but smaller/cheaper/more accurate per call. | 2026-02-13 |
| 14 | Agent writes raw state, reducers are frontend-only | Eliminates the cross-language reducer problem (TypeScript reducers, Python agent). The agent computes new state directly. The frontend uses reducers for user interactions. Both write to the same table. | 2026-02-13 |
| 15 | Materialized summary column ("entities summarize themselves") | Every entity carries a `summary` field, written by whoever last mutated it. Agent writes summaries on agent mutations, frontend writes summaries on user mutations. query_entities reads summaries directly — no computation. | 2026-02-13 |
| 16 | SSE primary for agent changes, CDC for the rest | Eliminates race condition between SSE and CDC channels. Agent-created entities arrive instantly via SSE. CDC confirms and handles non-agent changes (user interactions, multi-tab sync). Zustand store upserts are idempotent. | 2026-02-13 |
| 17 | Visible entities only in Zustand store | Frontend store holds only window/card/sidebar entities. Hidden entities (memory, edges, facts) stay in Postgres, accessed by the agent directly. Keeps store small and fast. AgentChat manages its own conversation state. | 2026-02-13 |
| 18 | Drop `respond` tool, use native text output | The agent communicates through its natural text output (streamed via SSE as text deltas). No tool call needed to talk to the user. 4 tools: create, update, query, read. | 2026-02-13 |
| 19 | query_entities returns summaries, read_entity returns full state | Grep → read pattern from Claude Code / Anthropic's agentic search guidance. Queries are cheap (small responses). Agent only loads full state for what it actually needs. Scales well. | 2026-02-13 |
| 20 | Shared service token for Railway auth | `DOMUS_SERVICE_TOKEN` env var on Vercel + Railway. Simpler than per-user JWTs or mTLS. RLS provides defense-in-depth. | 2026-02-14 |
| 21 | App schemas served via API endpoint | `GET /api/schemas` on Vercel. Agent service fetches + caches. Always current truth, zero deployment coordination. | 2026-02-14 |
| 22 | Hybrid percentage/pixel positioning | Percentages for agent-created entities (reflow on refresh). Pixels after user drag (locked). ~15 lines of logic. | 2026-02-14 |
| 23 | RFC 7396 JSON Merge Patch for entity state | Provided fields overwrite, omitted preserved, null deletes, arrays replaced entirely. Agent does read-modify-write for arrays. Custom `jsonb_merge_patch` PL/pgSQL function. | 2026-02-14 |
| 24 | Gemini 2.5 Flash Image, single-shot calls | Production/GA, $0.039/image. Claude manages multi-turn context, constructs rich prompts. Gemini chat API is just a wrapper — no hidden state. Stateless calls align with architecture. | 2026-02-14 |
| 25 | Three image intents: generate, edit, inspire | Claude decides intent from conversation. Edit = modify existing image. Inspire = new image from references. Generate = text only. All route through existing 4-tool surface. | 2026-02-14 |
| 26 | Space templates, not "default" spaces | `space_templates` table stores entity blueprints. On first sign-in, stamp "Starter" template into new space. Multiple templates post-v1. | 2026-02-14 |
| 27 | Close = hide, Delete = archive | Window X button sets `presentation: 'hidden'` (entity persists, agent aware). Explicit delete sets `archived: true` (soft delete). | 2026-02-14 |
| 28 | Concurrent turns, Claude Code model | Queue messages mid-turn. Agent absorbs new instructions between tool calls. "stop" cancels current task. Execution doesn't halt on new prompt. | 2026-02-14 |
| 29 | React Error Boundaries per app | Each `<AppRenderer>` wraps in Error Boundary. Crashed app shows fallback card, doesn't take down the space. | 2026-02-14 |
| 30 | Entity index includes hidden (non-archived) entities | Agent needs awareness of docked/hidden entities to reopen them. Zustand store still only renders visible entities. | 2026-02-14 |
| 31 | Perplexity API for web search (5th tool) | Agent needs external research capability. Perplexity returns sourced answers with citations. Adds one tool (`web_search`) to the entity tool surface. Called from `tools.py` via httpx. | 2026-02-14 |
| 32 | Minimal guest mode via Supabase anonymous auth | New visitors get an anonymous Supabase session + real UUID on first visit (client-side `signInAnonymously()`). `handle_new_user` trigger auto-creates profile. Space created from Starter template. Returning visitors get server-side redirect (no client JS). Sign-in uses `linkIdentity` to preserve UUID/space/entities; if Google account already exists on another user, falls back to `signInWithOAuth` (anonymous data abandoned, existing account loaded). Feature gate after N interactions — agent communicates conversationally, not via modal. | 2026-02-14 |
| 33 | Chat app is in scope, multi-user collaboration is not | Chat entities enable user-to-user messaging via Supabase Realtime channels. This is messaging within a user's own space, not shared editing or co-presence on the same canvas. | 2026-02-14 |
| 34 | Sheet as transient viewing/editing mode, not presentation type | Cards open in a bottom sheet for full-screen viewing and rich text editing. The sheet is a UI overlay — the entity stays `presentation: 'card'` in the database. No separate "document window" presentation. | 2026-02-14 |
| 35 | Claude native PDF parsing for file processing | Uploaded files sent to Claude as document content blocks. Claude extracts structured data. No OCR pipeline, no third-party parsing — Claude handles it natively. Original files in Supabase Storage, extracted data as entities. | 2026-02-14 |
| 36 | Billing and usage tracking as core infrastructure | Usage events table tracks agent turns, image generation, file processing, web search. Feature gating at the agent service level. Conversational limit communication. Required for sustainable product — not optional polish. | 2026-02-14 |
| 37 | Folder as entity type | `type: 'folder'` groups entities visually on canvas. Children linked via edge entities (`relation: 'contains'`). Agent creates folders for canvas organization. No filesystem semantics — visual grouping only. | 2026-02-14 |
| 38 | Username + invite links for user discovery | Users have unique usernames set during onboarding. User discovery via username search or shareable invite links. Public profiles (username, name, avatar) readable by all users. | 2026-02-14 |
| 39 | Chat as default app in every space | Chat is a built-in app type. Each user has their own chat entity in their space. Messages delivered via Supabase Realtime channels. Chat entity state stores message history. | 2026-02-14 |
| 40 | Tiptap for rich text editing | Tiptap (ProseMirror-based) for rich text editing in sheets and document windows. Added to frontend dependencies. | 2026-02-14 |
| 41 | Desktop-only web, native iOS for mobile | No mobile web experience. Mobile visitors see "Download Domus on mobile" page. Native iOS app is post-v1. | 2026-02-14 |
| 42 | Domus Citizen plan, no free tier | All signed-up users are Domus Citizen (paid). Extra Usage available for additional capacity. No free tier — guest mode is the trial experience. | 2026-02-14 |
| 43 | Email for reminder notifications | Calendar reminders send email notifications when the user is not active in Domus. No push notifications or SMS for v1. In-app, agent surfaces reminders when user opens the space. | 2026-02-14 |
| 44 | Agent proactivity deferred to post-v1 | Background agents (calendar-triggered, proactive summaries, end-of-day reviews) are post-v1. Agent is reactive only for v1. | 2026-02-14 |
| 45 | Agent-generated apps via declarative composition | Apps like charts, checklists, and dashboards are not built-in — the agent composes them on the fly by writing block specs as entity state. A generic block renderer interprets the spec. No code generation — the agent composes from a fixed library of primitives (content, data, media, input, references, layout). Core `apps/` stays thin. | 2026-02-15 |
| 46 | Global facts for cross-space preferences | Per-space preferences stored as fact entities in that space. Cross-space preferences (theme, accent color) stored on the users table or as user-level facts. Agent checks both scopes. | 2026-02-14 |
| 47 | Layout engine handles entity collision detection | Frontend layout engine avoids overlaps when placing agent-created entities. Agent uses percentage coordinates; layout engine resolves collisions. Post-v1: consider agent pixel-level control for precise arrangements. | 2026-02-14 |
| 48 | Guest mode counts agent interactions + file uploads | Guest interaction limit (N) counts agent turns and file uploads. Opens, drags, and reads do not count. Exact value of N is TODO. | 2026-02-14 |
| 49 | Window close control top-left, app options top-right | Window chrome has a single close control on the top left plus app-specific option buttons on the top right. Close = hide (presentation: hidden). Archive is a separate context menu action. No "delete" concept on window chrome. Header is a transparent drag zone — no background, no title text. | 2026-02-14 |
| 50 | @use-gesture + motion for canvas interaction | Custom window management — no library. @use-gesture handles drag, pinch, wheel for both entity dragging and canvas pan/zoom. motion (rebranded from framer-motion) handles spring physics (agent actions), instant transforms (user actions), presence animations, and agent glow. Z-index via Zustand. Viewport culling via position bounds check. | 2026-02-14 |
| 51 | Declarative composition over code generation | Agent assembles from block primitives as entity state. No eval, no sandbox. Fits the 4-tool model — it's just `create_entity` with a `state.blocks` array. Safer, simpler, more reliable than runtime code evaluation. | 2026-02-15 |
| 52 | Block library spans UI, storage, references, and input | Not just rendering — file blocks reference Supabase Storage, entity-ref blocks link entities, input blocks persist user data. Composed apps are full-featured, not display-only. | 2026-02-15 |
| 53 | Interactive blocks — block renderer acts as reducer | No per-app reducer for composed apps. User interactions (check, toggle, type) write directly to entity state via the block renderer. Same write path as built-in apps, just without a custom reducer function. | 2026-02-15 |
| 54 | ~~AppRenderer fallback~~ → Superseded by decision 62 (unified registry) | Originally: block renderer as fallback for unknown types. Now: unified registry with `AppType = BuiltInApp \| ComposedApp`. See decision 62. | 2026-02-15 |
| 55 | Block schema validation in tools.py | Every block validated against its type's required fields on create/update. Returns specific errors so agent can fix + retry within the same turn. Referential checks for entity-refs and file URLs. | 2026-02-15 |
| 56 | Detection-based builder prompt injection | Builder prompt not in base system prompt — injected by `context.py` only when agent is composing. Same pattern as dynamic schema discovery. Keeps system prompt thin (~30-40 lines injected only when needed). | 2026-02-15 |
| 57 | Agent iteration via existing tool loop | No new tools for plan/execute/verify. Agent uses create → read → verify → update cycle within the existing `while True` loop. Builder prompt includes iteration guidance. | 2026-02-15 |
| 58 | Markdown-first entity model: `content` + `state` | Added `content text` column to entities. Agent writes markdown into `content` (~80% of entities). `state jsonb` holds structured data only when a renderer needs typed fields (dates, URLs, datasets). Keeps agent read/write simple — no JSON parsing for text-heavy entities. Full-text search indexes both columns. | 2026-02-15 |
| 59 | Canvas as inset card, not edge-to-edge | The Canvas is a full-viewport inset card (slight padding from browser edges, rounded corners) sitting on the `surface` browser background. Tonal separation (`surface` → `surface-sunken`) communicates "you're inside a space." The inset makes the space feel like a room, not a webpage. | 2026-02-15 |
| 60 | App Dock replaces sidebar terminology | The app launcher component is "App Dock" — can fully hide (not just collapse to icon-only). Same function as previous "sidebar" concept: houses app types + docked panels. `presentation: 'sidebar'` remains as the entity presentation type. | 2026-02-15 |
| 61 | Stripe for payments | Stripe Checkout (hosted page) for subscriptions, Stripe Customer Portal for management, webhooks for state sync. No custom payment forms. `stripe` Node SDK server-side only. `stripe_customer_id` on users table. | 2026-02-15 |
| 62 | Unified app registry (built-in + composed) | Registry describes all renderable types via `AppType = BuiltInApp \| ComposedApp`. Built-in entries from file-based auto-discovery. Composed entries derived from entity data at runtime. Single dispatch path in AppRenderer. Composed types get same system prompt treatment as built-in (block summary in "Relevant App Types"). Promotion path: add `apps/` folder, type name carries over, existing entities render with new component. | 2026-02-15 |
| 63 | Singleton apps (maxInstances: 1) | Built-in apps can declare `maxInstances: 1` (e.g., chat, calendar). Only one entity of that type per space. Dock open reveals existing hidden entity or creates if absent. Agent's `create_entity` returns existing entity for singleton types. Close hides, reopen reveals — no duplicates. | 2026-02-16 |
| 64 | pg_cron cleanup for anonymous sessions | Anonymous users that never upgrade are dead weight (count toward MAU, accumulate data). Daily `pg_cron` job deletes `auth.users` where `is_anonymous = true` and older than 14 days. Cascade FKs clean up `public.users`, `spaces`, and `entities` automatically. No built-in Supabase auto-cleanup exists. | 2026-02-16 |
