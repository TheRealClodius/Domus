# Domus — Architecture

This is the founding document. Every decision flows from here. Read this before writing a single line of code.

---

## What We're Building

An agent-first spatial OS. The AI agent is the primary interface — not the UI, not the apps, not the canvas. The user talks to the agent, and the agent creates, arranges, and manipulates everything on screen. Windows, notes, calendars, images — they're all just rendering surfaces for what the agent produces.

The product feeling: you walk into a room and say what you need. The room rearranges itself.

---

## North Star Principles

**1. Everything is an entity.**
A sticky note, a calendar, a chat window, a generated image, a memory of what the user said last week — they're all rows in the same table. The system does not structurally distinguish between them. The `type` field determines what component renders it. The `presentation` field determines how it's framed (window, sidebar panel, canvas card, hidden).

**2. The agent has 4 tools, not 15.**
`create_entity`, `update_entity`, `query_entities`, `read_entity`. That's the entire tool surface. Every interaction — opening a window, editing a note, rearranging the canvas, adding a calendar event — is expressed through these four verbs. The agent communicates with the user through its natural text output, not through a tool. If you're tempted to add a fifth tool, you're doing something wrong.

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
A workspace owned by a user. Contains entities and a space-bound agent instance. One user can have multiple spaces. A space is the unit of isolation — you never see entities from another space, and the agent in one space has no knowledge of another.

**Space lifecycle:**
- **First sign-in:** Domus creates a space from the "Starter" template (welcome note, initial personality traits, tutorial card). Templates are pre-defined entity blueprints — not "default" spaces.
- **Creation:** Users can create new spaces (blank or from templates). v1 ships with one system template ("Starter"). Multiple templates + user-created templates are post-v1.
- **Switching:** The user profile tracks `active_space_id`. Switching spaces is a full context switch — different entities, different agent memory, different conversation history.
- **Deletion:** Deleting a space cascades to all its entities (Postgres `ON DELETE CASCADE`).
- **Hierarchy:** `User (Google OAuth) → Space(s) → Entities + Space-Bound Agent`
- v1 only supports Google sign-in via Supabase Auth.

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
state       jsonb       app-specific, opaque to the system
summary     text        one-line description, written by whoever last mutated the entity
created_by  text        'user' | 'agent'
archived    boolean
created_at  timestamptz
updated_at  timestamptz
```

A chat window is an entity. A sticky note is an entity. A generated image is an entity. A conversation turn in the agent's memory is a hidden entity. A user preference the agent has learned is a hidden entity. The system treats them all the same.

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

### Agent
The orchestrator. Takes user input + a lightweight entity index, calls Claude (Sonnet), executes tool calls against the entities table, streams responses back. Stateless per request — all state lives in entities. Discovers context on demand via tool calls rather than pre-loading it. Runs as a Python FastAPI service on Railway, separate from the frontend.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for first load, route handlers for SSE proxy, one frontend deployment |
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
| Frontend deploy | Vercel | Managed. SSR + edge. Proxy to agent service for SSE |

**Frontend dependencies** (the platform itself):
- `next`
- `react`
- `@supabase/supabase-js`
- `zustand`
- `tailwindcss`

**Agent service dependencies** (Python):
- `fastapi`
- `uvicorn`
- `anthropic`
- `google-genai` (image generation only)
- `supabase` (Python client)
- `networkx`

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
└──────┬───────────┬──────────┘
       │           │
       ▼           ▼
┌────────────┐ ┌──────────────┐
│  Supabase  │ │  Claude API  │
│  Postgres  │ │  (Anthropic) │
│  Auth      │ │              │
│  Realtime  │ │  Gemini API  │
│  Storage   │ │  (image gen) │
└────────────┘ └──────────────┘
```

**Service authentication:**
The Railway agent service is not publicly accessible. The Vercel SSE proxy (`/api/agent/route.ts`) is the only entry point. Authentication works in two layers:
1. **User auth:** Vercel validates the Supabase auth cookie → extracts `user_id`
2. **Service auth:** Vercel forwards to Railway with `Authorization: Bearer <DOMUS_SERVICE_TOKEN>` header. `DOMUS_SERVICE_TOKEN` is a shared high-entropy secret set as an env var on both Vercel and Railway. Railway rejects any request without a valid token.

The agent service trusts `user_id` and `space_id` from the payload because Vercel already validated the user. RLS on Supabase provides defense-in-depth — even if the service token leaks, queries are scoped by `user_id`.

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
│       └── schemas/
│           └── route.ts            # App schemas as JSON (consumed by Python agent service)
│
├── apps/                           # Drop-in app system
│   ├── _registry.ts                # Auto-discovery via import.meta.glob
│   ├── calendar/
│   │   ├── index.ts                # Schema + reducer + summarize
│   │   └── CalendarApp.tsx         # React component
│   ├── chat/
│   │   ├── index.ts
│   │   └── ChatApp.tsx
│   ├── notes/
│   │   ├── index.ts
│   │   └── NotesApp.tsx
│   ├── image-gen/
│   │   ├── index.ts
│   │   └── ImageGenApp.tsx
│   └── files/
│       ├── index.ts
│       └── FilesApp.tsx
│
├── core/                           # Platform internals (not app-specific)
│   ├── SpaceRenderer.tsx           # Renders entities by presentation type
│   ├── Window.tsx                  # Window chrome: drag, resize, close, glow
│   ├── CanvasCard.tsx              # Canvas card chrome
│   ├── SidebarPanel.tsx            # Sidebar panel chrome
│   ├── AppRenderer.tsx             # Resolves entity type → app component
│   ├── AgentChat.tsx               # Agent conversation UI (always visible)
│   ├── entityStore.ts              # Zustand store for visible entities only (not hidden)
│   └── supabase.ts                 # Supabase client singleton
│
├── tokens/                         # Design system
│   ├── seeds.ts                    # Base values (scale, brand hues)
│   ├── palettes.ts                 # Generated color palettes (light + dark)
│   ├── tokens.css                  # Output: CSS custom properties
│   └── tailwind.config.ts          # Maps custom properties → Tailwind classes
│
├── lib/                            # Shared utilities (thin)
│   ├── id.ts                       # ULID generation
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
│   ├── tools.py                    # 4 tool definitions + executors (create, update, query, read)
│   ├── context.py                  # Build lightweight system prompt (entity index, not full state)
│   ├── memory.py                   # Compaction (no embeddings — recency + graph + full-text search)
│   └── image_gen.py                # Gemini image generation (called by tools.py for type='image')
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
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  presentation text not null default 'window',
  position jsonb not null default '{"x": 50, "y": 50, "locked": false}',
  size jsonb not null default '{"width": 600, "height": 400}',
  z_index int not null default 0,
  state jsonb not null default '{}',
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
create index entities_summary_fts_idx on public.entities
  using gin (to_tsvector('english', coalesce(summary, '')));

-- Row-Level Security
alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.entities enable row level security;

create policy "users read own profile" on public.users for select using (id = auth.uid());
create policy "users update own profile" on public.users for update using (id = auth.uid());

create policy "users crud own spaces" on public.spaces for all using (user_id = auth.uid());

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

Four tables (users, spaces, space_templates, entities). Seven policies. One trigger. One full-text index. One merge function. That's the entire backend data layer. No pgvector, no embeddings — agentic search + full-text search + knowledge graph handle context retrieval.

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

**Post-v1:** If multi-model support becomes necessary, introduce a provider abstraction at that point. The key adapter challenges to plan for: Gemini's mandatory thought signatures (encrypted opaque tokens that must be preserved across turns), name-based tool result linking (vs. Claude's UUID-based), and different streaming semantics.

---

## App Contract

Every app in `apps/` exports a default object conforming to this shape:

```typescript
// apps/_types.ts

import { z } from 'zod'
import { ComponentType } from 'react'

export type AppDefinition<
  TState extends z.ZodObject<any> = z.ZodObject<any>,
  TActions extends Record<string, z.ZodObject<any>> = Record<string, z.ZodObject<any>>,
> = {
  type: string                                    // unique identifier, matches entity.type
  name: string                                    // human-readable display name
  icon: ComponentType                             // icon component (lucide-react or similar)
  component: ComponentType<AppProps<z.infer<TState>>>  // the React UI

  defaultPresentation: 'window' | 'card' | 'sidebar'
  defaultSize: { width: number; height: number }

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

export type AppProps<TState> = {
  entityId: string
  state: TState
  dispatch: (action: string, params: any) => void  // calls reduce → writes state + summary to Supabase
}
```

**Two write paths, one table:**
- **User interacts** → `dispatch(action, params)` → reducer computes new state → `summarize()` generates summary → both written to Supabase
- **Agent acts** → `update_entity` tool writes raw state + summary directly to Supabase → no reducer involved

Both paths end up writing to the same entities table. CDC syncs all clients.

**Auto-discovery:**

```typescript
// apps/_registry.ts
const modules = import.meta.glob('./*/index.ts', { eager: true })

export const apps: Record<string, AppDefinition> =
  Object.fromEntries(
    Object.values(modules).map((m: any) => [m.default.type, m.default])
  )

export const getApp = (type: string) => apps[type]
```

App schemas are served as JSON via a Vercel API endpoint (`GET /api/schemas`). The route imports the registry, converts each app's Zod state schema to JSON Schema (via `zod-to-json-schema`), and returns the result. The Python agent service fetches schemas from this endpoint on startup and caches them in-memory. This means schemas are always the current truth — no build step, no shared artifact store, no manual copy. See "Dynamic Schema Discovery" in Agent Design.

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
{only schemas for app types relevant to the current turn — 1-3 types, not all}
  ### {app.name} (type: "{app.type}")
  State: {JSON schema of app.schema.state}

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

**What's NOT in the system prompt:**
- Full entity state (agent uses `read_entity` to load details on demand)
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
                "state": {"type": "object", "description": "Initial state conforming to the app schema"},
                "summary": {"type": "string", "description": "One-line description of the entity"},
            },
            "required": ["type"],
        },
    },
    {
        "name": "update_entity",
        "description": "Update an existing entity. Writes state directly (no reducer). Uses RFC 7396 JSON Merge Patch: provided fields overwrite, omitted fields preserved, null deletes a key, arrays are always replaced entirely (not appended).",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entity ID"},
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
        "description": "Get a single entity's full state by ID. Use after query_entities to load details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entity ID to read"},
            },
            "required": ["id"],
        },
    },
]
```

**No `respond` tool.** The agent communicates through its natural text output, which streams to the frontend via SSE as text deltas. Text output is saved as a `conversation_turn` entity after the turn completes.

**State merge semantics (RFC 7396 JSON Merge Patch):**
- Provided scalar fields overwrite existing
- Provided object fields are recursively merged
- `null` means delete the key
- Arrays are always replaced entirely — never appended, never merged by index
- Omitted fields are preserved unchanged
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

<!-- TODO: Rate limiting — implement per-user token bucket at the Vercel proxy level (e.g., 30 turns/hour free tier). Enforce before requests hit Railway. -->

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
    <div className="relative w-screen h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 border-r border-surface-raised">
        {entities
          .filter(e => e.presentation === 'sidebar')
          .map(e => <SidebarPanel key={e.id} entity={e} />)}
      </aside>

      {/* Canvas */}
      <main className="ml-72 relative w-full h-full">
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
  )
}
```

### Window chrome

The window component handles: drag (onPointerDown/Move/Up → sets `position.locked: true` with pixel coords), resize (corner handles), close (sets `presentation: 'hidden'` — not archive, entity persists and agent can reopen), focus (set highest z_index), and the agent-origin glow (entity.created_by === 'agent' && recently updated). Delete is a separate explicit action (right-click menu) that sets `archived: true`. This is ~150 lines of well-tested code. No library needed.

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
- **Multi-user collaboration.** v1 scope is single-user spaces. The entity model supports multi-user, but we're not building the UX for it yet.
- **Plugin / extension system.** Apps are first-party for now. The folder-drop pattern means adding an app is easy, but there's no third-party plugin API.

---

## Build Order

These phases are a suggested progression, not a strict plan. The document's primary purpose is to define architecture and decisions that Claude Code agent teams can execute against. Teams may work on phases in parallel or reorder based on priorities.

Phase 1 — **Skeleton**:
1. Next.js project + Supabase project + Railway project + env wiring + `DOMUS_SERVICE_TOKEN`
2. Database migration (4 tables + RLS + full-text index + `jsonb_merge_patch` function)
3. Auth (Google sign-in, protected routes, `active_space_id` on users)
4. Space creation from "Starter" template on first sign-in
5. Entity store (visible entities only) + CDC subscription
6. SpaceRenderer with Window chrome (drag → lock position, resize, close → hide, delete → archive, focus)
7. One app: notes (simplest possible — text in a window)

Phase 2 — **Agent**:
1. FastAPI agent service on Railway + `DOMUS_SERVICE_TOKEN` auth
2. Agent loop using Anthropic SDK directly (4 tools + SSE streaming)
3. SSE proxy in Next.js API route (context stack: space_id, message, viewport, focused_entity_id, visible_entity_ids)
4. App schemas API endpoint (`/api/schemas`) + agent service schema cache
5. AgentChat UI (input + streaming response + tool call indicators)
6. Lightweight system prompt builder (entity index with presentation + z_index, dynamic schema discovery)
7. SSE-based entity sync (agent changes applied immediately from SSE, CDC confirms)
8. Concurrent turn handling (message queue, mid-turn instructions, cancellation)

Phase 3 — **Knowledge Graph**:
1. Edge entities + NetworkX ops
2. Agent discovers and creates relationships via create_entity(type='edge')
3. Agent queries graph on demand via query_entities(type='edge')

Phase 4 — **Apps** (one at a time):
1. Calendar (schema + reducer + component)
2. Image generation (Gemini 2.5 Flash Image — generate, edit, inspire intents from tools.py)
3. Files (persistent storage, entity type with file references in Supabase Storage)
4. Chat/messages
5. Each app is independent. Build, test, ship separately.

Phase 5 — **Memory**:
1. Conversation turns as hidden entities
2. Compaction (Opus summarizes old turns, extracts facts)
3. Full-text search in query_entities tool
4. Fact and personality_trait extraction
5. Agent retrieves memory on demand via tool calls

Phase 6 — **Polish**:
1. Design tokens pipeline + theme switching
2. Canvas arrangement (auto-layout, snap to grid)
3. Onboarding flow
4. Usage tracking / credits
5. Performance (lazy loading apps, optimistic updates, pagination)

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
