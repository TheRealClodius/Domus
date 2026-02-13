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
A workspace owned by a user. Contains entities. One user can have multiple spaces. A space is the unit of isolation — you never see entities from another space.

### Entity
Anything that exists in a space. The universal data structure:

```
id          uuid
space_id    uuid        → spaces.id
user_id     uuid        → users.id
type        text        'calendar' | 'note' | 'chat' | 'image' | 'conversation_turn' | 'fact' | ...
presentation text       'window' | 'card' | 'sidebar' | 'hidden'
position    jsonb       { x, y }
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

**Data flow (two channels):**
- **Agent changes (SSE primary):** User sends message → Vercel validates auth, proxies to Railway → FastAPI agent loop streams Claude calls → tool calls execute against Supabase Postgres → tool results (including created/updated entities) stream back via SSE → frontend applies entity changes immediately from SSE → React re-renders.
- **Non-agent changes (CDC):** User interacts directly with a window (drag, type, resize) → frontend writes to Supabase → CDC fires Realtime event → other tabs/sessions receive the update.
- **Reconciliation:** CDC events also fire for agent-created entities. The Zustand store treats all updates as idempotent upserts (keyed by entity ID). SSE delivers agent changes instantly; CDC confirms and handles everything else.

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
│       └── agent/
│           └── route.ts            # SSE proxy to Railway agent service
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
│   ├── entityStore.ts              # Single Zustand store for all entities
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

-- Entities (the only table that matters)
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  presentation text not null default 'window',
  position jsonb not null default '{"x": 100, "y": 100}',
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
```

Three tables. Six policies. One trigger. One full-text index. That's the entire backend data layer. No pgvector, no embeddings — agentic search + full-text search + knowledge graph handle context retrieval.

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

## Provider Abstraction

The agent loop talks to models through a protocol, not a concrete SDK.

```python
# providers/base.py

from typing import Protocol, AsyncIterator
from dataclasses import dataclass

@dataclass
class ToolCall:
    id: str             # UUID (normalized — synthetic for Gemini)
    name: str
    arguments: dict

@dataclass
class ToolResult:
    tool_call_id: str
    name: str           # needed for Gemini (links by name, not ID)
    content: str
    is_error: bool = False

class StreamEvent:
    pass

@dataclass
class TextDelta(StreamEvent):
    text: str

@dataclass
class ToolCallEvent(StreamEvent):
    tool_call: ToolCall

@dataclass
class MessageEnd(StreamEvent):
    has_tool_calls: bool

class ModelProvider(Protocol):
    async def stream(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict],
        max_tokens: int,
    ) -> AsyncIterator[StreamEvent]:
        ...
```

### Key differences the adapters handle

| Concept | Claude (Anthropic) | Gemini (Google) |
|---|---|---|
| Tool call in response | `tool_use` block with `id`, `name`, `input` | `functionCall` part with `name`, `args` |
| Tool result linking | UUID-based (`tool_use_id`) — unambiguous | Name-based + ordering — adaptor must preserve order |
| Roles | `user`, `assistant` | `user`, `model` |
| Streaming tool args | Not supported | `stream_function_call_arguments=True` |
| Thought signatures | N/A | Must preserve opaque tokens across turns |

The agent loop only sees `StreamEvent`, `ToolCall`, `ToolResult`. It never knows which model is running.

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

  // Agent interface — declarative, not imperative
  schema: {
    state: TState                                 // shape of entity.state for this type
    actions: TActions                             // named actions the agent can invoke
  }

  // Pure function: (current state, action name, params) → new state
  reduce: (state: z.infer<TState>, action: string, params: any) => z.infer<TState>

  // What the agent sees as context — one-line summary of current state
  summarize: (state: z.infer<TState>) => string
}

export type AppProps<TState> = {
  entityId: string
  state: TState
  dispatch: (action: string, params: any) => void  // calls reduce → persists to Supabase
}
```

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

App schemas are also exported as JSON for the Python agent service to consume. The agent service fetches the schema registry on startup (or via a health endpoint).

---

## Agent Design

### System Prompt Structure

```
You are the Domus assistant. You help users by creating and managing entities in their space.

## Your Tools
- create_entity: Create any entity (app, note, image) in the space
- update_entity: Mutate an entity's state via its schema actions
- query_entities: Search/list entities in the space
- respond: Send text or images back to the user

## Available App Types
{for each app in registry:}
  ### {app.name} (type: "{app.type}")
  State: {JSON schema of app.schema.state}
  Actions: {JSON schema of each action in app.schema.actions}

## Current Space
{for each non-archived entity:}
  - [{entity.id}] {entity.type} ({entity.presentation}) — {app.summarize(entity.state)}
{end}
Focused: {focused_entity_id or "none"}

## Related Context (graph)
{edges connecting focused/relevant entities — traversed via NetworkX}

## Personality
{all personality_trait entities for this space}

## Recent Memory
{last 10 conversation turns}
{summaries covering older turns}
{semantically relevant facts}
```

The system prompt is generated fresh on every request from the entities table. No caching. If this becomes slow, cache the schemas (they don't change at runtime) but always query live entity state.

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
                "presentation": {"type": "string", "enum": ["window", "card", "sidebar"], "default": "window"},
                "position": {"type": "object", "properties": {"x": {"type": "number"}, "y": {"type": "number"}}},
                "size": {"type": "object", "properties": {"width": {"type": "number"}, "height": {"type": "number"}}},
                "state": {"type": "object", "description": "Initial state conforming to the app schema"},
            },
            "required": ["type"],
        },
    },
    {
        "name": "update_entity",
        "description": "Update an existing entity by dispatching an action from its schema.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Entity ID"},
                "action": {"type": "string", "description": "Action name from the app schema"},
                "params": {"type": "object", "description": "Action parameters conforming to the action schema"},
            },
            "required": ["id", "action", "params"],
        },
    },
    {
        "name": "query_entities",
        "description": "Search and list entities in the space. Use to find content, check state, or understand context.",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "description": "Filter by entity type"},
                "search": {"type": "string", "description": "Semantic search query (uses embeddings)"},
                "presentation": {"type": "string", "description": "Filter by presentation mode"},
                "include_archived": {"type": "boolean", "default": False},
                "limit": {"type": "number", "default": 20},
            },
        },
    },
    {
        "name": "respond",
        "description": "Send a text response to the user. Always use this to communicate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string"},
            },
            "required": ["text"],
        },
    },
]
```

### Agent Loop

```python
# agent/loop.py

async def run_agent(
    space_id: str,
    user_id: str,
    message: str,
    provider: ModelProvider,
    on_event: Callable[[StreamEvent], Awaitable[None]],
):
    system = await build_system_prompt(space_id)
    history = await get_recent_history(space_id, user_id)
    messages = [*history, {"role": "user", "content": message}]

    await save_conversation_turn(space_id, user_id, "user", message)

    while True:
        tool_calls = []

        async for event in provider.stream(
            system=system,
            messages=messages,
            tools=tool_definitions,
            max_tokens=4096,
        ):
            await on_event(event)
            if isinstance(event, ToolCallEvent):
                tool_calls.append(event.tool_call)
            if isinstance(event, MessageEnd) and not event.has_tool_calls:
                break

        if not tool_calls:
            break

        # Execute tool calls (parallel — they're independent)
        results = await asyncio.gather(*[
            execute_tool(tc.name, tc.arguments, space_id, user_id)
            for tc in tool_calls
        ])

        tool_results = [
            ToolResult(
                tool_call_id=tc.id,
                name=tc.name,
                content=json.dumps(r),
            )
            for tc, r in zip(tool_calls, results)
        ]

        messages.append({"role": "assistant", "tool_calls": tool_calls})
        messages.append({"role": "tool", "results": tool_results})

    # Compaction check
    turn_count = await count_recent_turns(space_id)
    if turn_count > 40:
        await compact_memory(space_id, user_id)
```

The entire agent. ~40 lines of logic. The provider abstraction handles all model-specific translation.

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

**Context assembly** (called when building system prompt):

1. Query last 10 `conversation_turn` entities (by `created_at` desc) — full text
2. Query `conversation_summary` entities — compressed history
3. If user message provided, embed it and vector-search across all memory entities for relevance
4. Always include all `personality_trait` entities
5. Traverse knowledge graph edges from relevant entities (NetworkX BFS, depth=2)

**Compaction** (triggered when turn count exceeds threshold):

1. Take turns 11-40 (the ones that just rolled out of the "recent" window)
2. Call a strong model with: "Summarize this conversation segment. Extract any facts about the user."
3. Create a `conversation_summary` entity with the summary
4. Create `fact` entities for any new facts
5. Create `edge` entities for any relationships discovered between entities
6. Mark the original turns as `archived: true`

No Mem0. No separate vector store. The entities table with pgvector IS the memory system.

---

## UI Architecture

### SpaceRenderer (the one component that matters)

```tsx
function SpaceRenderer({ spaceId }: { spaceId: string }) {
  const entities = useEntityStore(s =>
    Object.values(s.entities).filter(e => !e.archived)
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

The window component handles: drag (onPointerDown/Move/Up), resize (corner handles), close (archive entity), focus (set highest z_index), and the agent-origin glow (entity.created_by === 'agent' && recently updated). This is ~150 lines of well-tested code. No library needed.

### Realtime sync

```typescript
// core/entityStore.ts — realtime subscription setup

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
      switch (payload.eventType) {
        case 'INSERT':
          store.upsert(payload.new as Entity)
          break
        case 'UPDATE':
          store.upsert(payload.new as Entity)
          break
        case 'DELETE':
          store.remove(payload.old.id)
          break
      }
    })
    .subscribe()
}
```

Agent creates entity → Postgres INSERT → CDC event → Zustand store update → React re-render. One flow, no custom plumbing.

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
- **Custom vector store.** No Mem0, no Pinecone, no Weaviate. pgvector on the entities table.
- **AI framework.** No LangChain, no LlamaIndex. The provider abstraction is ~100 lines of protocol + adapter. That's not a framework.
- **Separate window/entity/app state management.** One Zustand store, one concept (entities).
- **Docker / self-hosted deployment (frontend).** Vercel for frontend, Railway for agent. If we outgrow managed services, we migrate. Not before.
- **Multi-user collaboration.** v1 scope is single-user spaces. The entity model supports multi-user, but we're not building the UX for it yet.
- **Plugin / extension system.** Apps are first-party for now. The folder-drop pattern means adding an app is easy, but there's no third-party plugin API.

---

## Build Order

Phase 1 — **Skeleton** (walk before you run):
1. Next.js project + Supabase project + Railway project + env wiring
2. Database migration (3 tables + RLS)
3. Auth (Google sign-in, protected routes)
4. Entity store + Realtime subscription
5. SpaceRenderer with Window chrome (drag, resize, focus)
6. One app: notes (simplest possible — text in a window)
7. Ship. You now have: sign in → see a space → create a note → drag it around.

Phase 2 — **Agent** (the actual product):
1. FastAPI agent service on Railway (basic health endpoint)
2. Provider abstraction + Claude adapter
3. Agent loop (4 tools + SSE streaming)
4. SSE proxy in Next.js API route
5. AgentChat UI (input + streaming response + tool call indicators)
6. System prompt builder (entity context + app schemas)
7. Ship. You now have: talk to agent → it creates notes → they appear on screen.

Phase 3 — **Multi-model + Graph**:
1. Gemini adapter for provider abstraction
2. Model selection config (per-space or global)
3. Knowledge graph — edge entities + NetworkX ops
4. Graph-enriched context in system prompt
5. Ship. Agent can use Claude or Gemini. Entities are connected.

Phase 4 — **Apps** (one at a time):
1. Calendar (schema + reducer + component)
2. Image generation (wraps an image API, agent can create_entity with type 'image')
3. Files (persistent storage, entity type with file references in Supabase Storage)
4. Chat/messages
5. Each app is independent. Build, test, ship separately.

Phase 5 — **Memory** (makes the agent smart):
1. Conversation turns as hidden entities
2. Compaction (summarize old turns)
3. Embedding generation on entity creation
4. Semantic search in query_entities tool
5. Fact and personality_trait extraction
6. Ship. The agent now remembers across sessions.

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
| 1 | Supabase over custom backend | Auth + Realtime + RLS + pgvector in one service. Eliminates ~40% of custom infrastructure. | 2026-02-12 |
| 2 | Single entities table | Unified model means 4 agent tools instead of 15. Every new app type is a new `type` value, not a new table. | 2026-02-12 |
| 3 | Tailwind over CSS modules | Faster development. Token pipeline outputs CSS custom properties either way. Tailwind just consumes them. | 2026-02-12 |
| 4 | Vercel for frontend | Agent SSE works with streaming responses. Pro plan gives 300s timeout. Revisit only if we hit limits. | 2026-02-12 |
| 5 | Entity-based memory over external store | Conversation history, facts, personality traits are all entities. One table, one embedding index, one query pattern. | 2026-02-12 |
| 6 | Supabase over GCloud for infrastructure | 3x cheaper at every scale. Realtime CDC, Auth+RLS integration, Storage — all included. GCloud credits reserved for AI APIs. | 2026-02-13 |
| 7 | Python FastAPI on Railway for agent service | Long-running agent loop needs a persistent process, not serverless. Python gives access to NetworkX, better AI SDK ecosystem. Railway is simple + affordable ($5/mo base). | 2026-02-13 |
| 8 | Multi-model: Claude + Gemini | Provider abstraction with thin adapters. Claude primary. Gemini via $2K GCloud credits. No lock-in to one provider. | 2026-02-13 |
| 9 | Knowledge graph: Postgres adjacency list + NetworkX | Edges are entities (type='edge'). No new tables, no new tools. NetworkX for graph ops in the Python agent. Zero infrastructure cost. | 2026-02-13 |
| 10 | No AI framework (LangChain, etc.) | 4 tools + provider protocol. The abstraction cost of a framework exceeds the value. Provider adapters are ~100 lines each. | 2026-02-13 |
| 11 | Sonnet default, Opus for compaction | Sonnet is fast enough for interactive chat. Opus is better for summarization and reasoning over long context. Cost optimization. | 2026-02-12 |
