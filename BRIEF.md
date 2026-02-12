# OS1 v2 — Starting Brief

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
`create_entity`, `update_entity`, `query_entities`, `respond`. That's the entire tool surface. Every interaction — opening a window, editing a note, rearranging the canvas, adding a calendar event — is expressed through these four verbs. If you're tempted to add a fifth tool, you're doing something wrong.

**3. Apps declare, they don't orchestrate.**
An app is a folder with a schema (what the agent can do), a reducer (how actions mutate state), a summarizer (what the agent sees), and a React component (what the user sees). No imperative `getCapabilities()`, no `executeAction()` callback, no registration step. Drop the folder in `apps/`, it exists.

**4. The database is the event bus.**
When the agent creates an entity, it's an INSERT. Supabase Realtime fires a CDC event. Every connected client receives it. No custom WebSocket server, no event emitter, no broadcast channel. Postgres change data capture is the only pub/sub mechanism.

**5. Auth is not our problem.**
Supabase Auth handles Google OAuth, session management, token refresh, and cookie security. Row-Level Security enforces user isolation at the query level. We write zero auth middleware.

**6. No frameworks on the AI side.**
No LangChain, no LlamaIndex, no Vercel AI SDK. The agent loop is a while loop that calls the Anthropic SDK, parses tool calls, executes them against Supabase, and streams text back. When your agent has 4 tools and one model, the loop IS the framework.

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
embedding   vector(1536) for semantic search (memory entities)
created_by  text        'user' | 'agent'
archived    boolean
created_at  timestamptz
updated_at  timestamptz
```

A chat window is an entity. A sticky note is an entity. A generated image is an entity. A conversation turn in the agent's memory is a hidden entity. A user preference the agent has learned is a hidden entity. The system treats them all the same.

### Agent
The orchestrator. Takes user input + entity context, calls Claude, executes tool calls against the entities table, streams responses back. Stateless per request — all state lives in entities.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR for first load, route handlers for agent SSE, one deployment unit |
| UI | React 19 | What we know, ecosystem for component libs |
| State | Zustand (single store) | One entity store. Not five stores for five concepts |
| Styling | Tailwind v4 + CSS custom properties | Token pipeline outputs custom properties, Tailwind consumes them |
| Database | Supabase Postgres | 3 tables. RLS for isolation. Managed |
| Realtime | Supabase Realtime | CDC on entities table. No custom WebSocket |
| Auth | Supabase Auth | Google OAuth. Zero custom auth code |
| Vector search | pgvector (on entities table) | Memory search. Same table, same index |
| File storage | Supabase Storage | Images, uploads. Pre-signed URLs |
| AI | Anthropic SDK (TypeScript) | Direct. No framework |
| Model | Claude Sonnet for chat, Opus for compaction | Two configs, not a routing system |
| Deploy | Vercel + Supabase | Both managed. Zero servers |

**Core dependencies** (the platform itself):
- `next`
- `react`
- `@supabase/supabase-js`
- `@anthropic-ai/sdk`
- `zustand`
- `tailwindcss`

Everything else is app-specific. A calendar app can pull in `date-fns`. A code editor can pull in `codemirror`. The platform stays thin.

---

## Directory Structure

```
os1/
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
│           └── route.ts            # POST: agent streaming endpoint (SSE)
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
├── agent/                          # Agent runtime (used by API route)
│   ├── loop.ts                     # The while loop. ~60 lines. THE agent.
│   ├── tools.ts                    # 4 tool definitions + executors
│   ├── context.ts                  # Build system prompt from entities
│   └── memory.ts                   # Compaction + embedding generation
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
├── supabase/
│   └── migrations/
│       └── 001_init.sql            # 3 tables + RLS + pgvector index
│
├── public/                         # Static assets
├── .env.local                      # Supabase URL + keys, Anthropic key
├── BRIEF.md                        # This file
└── package.json
```

**Rules:**
- `apps/` has zero imports from other `apps/`. Apps are isolated.
- `core/` never imports from `apps/`. It uses the registry.
- `agent/` never imports from `core/` or `apps/` directly. It reads schemas from the registry.
- `tokens/` has zero runtime dependencies. It's a build-time pipeline.
- `lib/` is utility only. No business logic. If it's growing, something is wrong.

---

## Database Schema

```sql
-- 001_init.sql

-- Enable pgvector
create extension if not exists vector;

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
  embedding vector(1536),
  created_by text not null default 'user',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index entities_space_id_idx on public.entities(space_id) where not archived;
create index entities_type_idx on public.entities(space_id, type) where not archived;
create index entities_embedding_idx on public.entities using ivfflat (embedding vector_cosine_ops) with (lists = 100);

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

Three tables. Six policies. One trigger. That's the entire backend data layer.

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

**Example — a complete app:**

```typescript
// apps/notes/index.ts

import { z } from 'zod'
import { StickyNote } from 'lucide-react'
import { lazy } from 'react'
import type { AppDefinition } from '../_types'

const stateSchema = z.object({
  title: z.string(),
  content: z.string(),
  color: z.enum(['yellow', 'blue', 'green', 'pink']).default('yellow'),
})

const definition: AppDefinition = {
  type: 'note',
  name: 'Note',
  icon: StickyNote,
  component: lazy(() => import('./NotesApp')),

  defaultPresentation: 'card',
  defaultSize: { width: 300, height: 300 },

  schema: {
    state: stateSchema,
    actions: {
      set_content: z.object({ content: z.string() }),
      set_title: z.object({ title: z.string() }),
      set_color: z.object({ color: z.enum(['yellow', 'blue', 'green', 'pink']) }),
    },
  },

  reduce(state, action, params) {
    switch (action) {
      case 'set_content': return { ...state, content: params.content }
      case 'set_title': return { ...state, title: params.title }
      case 'set_color': return { ...state, color: params.color }
      default: return state
    }
  },

  summarize: (state) =>
    `"${state.title || 'Untitled'}" (${state.color}) — ${state.content.length} chars`,
}

export default definition
```

That's the entire app registration. No agentInterface.js. No formatContext(). No getCapabilities(). One file, one shape.

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

---

## Agent Design

### System Prompt Structure

```
You are the OS1 assistant. You help users by creating and managing entities in their space.

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

## Personality
{all personality_trait entities for this space}

## Recent Memory
{last 10 conversation turns}
{summaries covering older turns}
{semantically relevant facts}
```

The system prompt is generated fresh on every request from the entities table. No caching. If this becomes slow, cache the schemas (they don't change at runtime) but always query live entity state.

### Tool Definitions

```typescript
// agent/tools.ts

const tools = [
  {
    name: 'create_entity',
    description: 'Create a new entity in the space. Use this to open apps, create notes, generate images, or add any content.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'The app type (e.g., "calendar", "note", "image")' },
        presentation: { type: 'string', enum: ['window', 'card', 'sidebar'], default: 'window' },
        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
        size: { type: 'object', properties: { width: { type: 'number' }, height: { type: 'number' } } },
        state: { type: 'object', description: 'Initial state conforming to the app schema' },
      },
      required: ['type'],
    },
  },
  {
    name: 'update_entity',
    description: 'Update an existing entity by dispatching an action from its schema.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entity ID' },
        action: { type: 'string', description: 'Action name from the app schema' },
        params: { type: 'object', description: 'Action parameters conforming to the action schema' },
      },
      required: ['id', 'action', 'params'],
    },
  },
  {
    name: 'query_entities',
    description: 'Search and list entities in the space. Use to find content, check state, or understand context.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by entity type' },
        search: { type: 'string', description: 'Semantic search query (uses embeddings)' },
        presentation: { type: 'string', description: 'Filter by presentation mode' },
        include_archived: { type: 'boolean', default: false },
        limit: { type: 'number', default: 20 },
      },
    },
  },
  {
    name: 'respond',
    description: 'Send a text response to the user. Always use this to communicate.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
      required: ['text'],
    },
  },
]
```

### Agent Loop

```typescript
// agent/loop.ts

export async function runAgent(opts: {
  spaceId: string
  userId: string
  message: string
  onText: (text: string) => void
  onToolCall: (name: string, result: any) => void
  onDone: () => void
}) {
  const { spaceId, userId, message, onText, onToolCall, onDone } = opts

  const system = await buildSystemPrompt(spaceId)
  const history = await getRecentHistory(spaceId, userId)
  const messages = [...history, { role: 'user' as const, content: message }]

  // Save user turn as entity
  await saveConversationTurn(spaceId, userId, 'user', message)

  while (true) {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      system,
      messages,
      tools: toolDefinitions,
      max_tokens: 4096,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onText(event.delta.text)
      }
    }

    const response = await stream.finalMessage()
    messages.push({ role: 'assistant', content: response.content })

    const toolUses = response.content.filter(b => b.type === 'tool_use')

    if (toolUses.length === 0) {
      // Agent is done — save assistant turn and exit
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')
      await saveConversationTurn(spaceId, userId, 'assistant', text)
      break
    }

    // Execute tool calls (parallel — they're independent)
    const results = await Promise.all(
      toolUses.map(async (tu) => {
        const result = await executeTool(tu.name, tu.input, spaceId, userId)
        onToolCall(tu.name, result)
        return { type: 'tool_result' as const, tool_use_id: tu.id, content: JSON.stringify(result) }
      })
    )

    messages.push({ role: 'user', content: results })
  }

  // Check if compaction needed
  const turnCount = await countRecentTurns(spaceId)
  if (turnCount > 40) {
    await compactMemory(spaceId, userId)
  }

  onDone()
}
```

That's the entire agent. ~50 lines of actual logic. The rest is types and imports.

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

**Context assembly** (called when building system prompt):

1. Query last 10 `conversation_turn` entities (by `created_at` desc) — full text
2. Query `conversation_summary` entities — compressed history
3. If user message provided, embed it and vector-search across all memory entities for relevance
4. Always include all `personality_trait` entities

**Compaction** (triggered when turn count exceeds threshold):

1. Take turns 11-40 (the ones that just rolled out of the "recent" window)
2. Call Claude (Opus) with: "Summarize this conversation segment. Extract any facts about the user."
3. Create a `conversation_summary` entity with the summary
4. Create `fact` entities for any new facts
5. Mark the original turns as `archived: true`

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

The window component handles: drag (onPointerDown/Move/Up), resize (corner handles), close (archive entity), focus (set highest z_index), and the orange glow (entity.created_by === 'agent' && recently updated). This is ~150 lines of well-tested code. No library needed.

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

---

## What We Are NOT Building

Be explicit about scope. These are things the current codebase has or partially has that we are intentionally not building in v2:

- **Custom auth system.** No JWT, no token revocation, no cookie management, no phone auth. Supabase Auth.
- **Custom WebSocket server.** No socket.io, no ws, no custom event protocol. Supabase Realtime.
- **Custom vector store integration.** No Mem0, no Pinecone, no Weaviate. pgvector on the entities table.
- **App capability caching.** Schemas don't change at runtime. If the system prompt is slow, cache schemas, not capabilities.
- **Separate window/entity/app state management.** One Zustand store, one concept (entities).
- **Docker / self-hosted deployment.** Vercel + Supabase. If we outgrow managed services, we'll migrate. Not before.
- **Multi-user collaboration.** v1 scope is single-user spaces. The entity model supports multi-user (add user_id to RLS policy as a membership check), but we're not building the UX for it yet.
- **Plugin / extension system.** Apps are first-party for now. The folder-drop pattern means adding an app is easy, but there's no third-party plugin API.

---

## Build Order

Phase 1 — **Skeleton** (walk before you run):
1. Next.js project + Supabase project + env wiring
2. Database migration (3 tables + RLS)
3. Auth (Google sign-in, protected routes)
4. Entity store + Realtime subscription
5. SpaceRenderer with Window chrome (drag, resize, focus)
6. One app: notes (simplest possible — text in a window)
7. Ship. You now have: sign in → see a space → create a note → drag it around.

Phase 2 — **Agent** (the actual product):
1. Agent loop (Claude API + 4 tools + SSE streaming)
2. AgentChat UI (input + streaming response + tool call indicators)
3. System prompt builder (entity context + app schemas)
4. Orange glow on agent-created entities
5. Ship. You now have: talk to agent → it creates notes → they appear on screen.

Phase 3 — **Apps** (one at a time):
1. Calendar (schema + reducer + component)
2. Image generation (wraps an image API, agent can create_entity with type 'image')
3. Files (persistent storage, entity type with file references in Supabase Storage)
4. Chat/messages
5. Each app is independent. Build, test, ship separately.

Phase 4 — **Memory** (makes the agent smart):
1. Conversation turns as hidden entities
2. Compaction (summarize old turns)
3. Embedding generation on entity creation
4. Semantic search in query_entities tool
5. Fact and personality_trait extraction
6. Ship. The agent now remembers across sessions.

Phase 5 — **Polish**:
1. Design tokens pipeline + theme switching
2. Canvas arrangement (auto-layout, snap to grid)
3. Onboarding flow
4. Usage tracking / credits
5. Performance (lazy loading apps, optimistic updates, pagination)

---

## Decision Log

Decisions made in this brief and why. Update this as we go.

| # | Decision | Rationale | Date |
|---|---|---|---|
| 1 | Supabase over custom backend | Auth + Realtime + RLS + pgvector in one service. Eliminates ~40% of current codebase. | 2026-02-12 |
| 2 | Single entities table | Unified model means 4 agent tools instead of 15. Every new app type is a new `type` value, not a new table. | 2026-02-12 |
| 3 | No AI framework | 4 tools + 1 model. The abstraction cost exceeds the value. Direct SDK usage in a while loop. | 2026-02-12 |
| 4 | Tailwind over CSS modules | Faster development. Token pipeline outputs CSS custom properties either way. Tailwind just consumes them. | 2026-02-12 |
| 5 | Vercel over self-hosted | Agent SSE works with streaming responses. Pro plan gives 300s timeout. Revisit only if we hit limits. | 2026-02-12 |
| 6 | Entity-based memory over external store | Conversation history, facts, personality traits are all entities. One table, one embedding index, one query pattern. | 2026-02-12 |
| 7 | Sonnet default, Opus for compaction | Sonnet is fast enough for interactive chat. Opus is better for summarization and reasoning over long context. Cost optimization. | 2026-02-12 |
