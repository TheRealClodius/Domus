# Iframe Sandbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agent generates React + shadcn/ui apps that render in sandboxed iframes with full state persistence and MCP schema/call support — indistinguishable from system apps to the agent.

**Architecture:** `/sandbox` Next.js route hosts the iframe runtime (react-runner + Sucrase + full shadcn/Tailwind/Lucide). Host component `IframeSandbox` manages postMessage bridge. Agent tools `build_app`/`update_app` generate and iterate on apps. Schema/call API routes extended to handle generated apps via static `_schema` in entity.state.

**Tech Stack:** react-runner, Sucrase (via react-runner), Tailwind Play CDN, shadcn/ui, Lucide React, postMessage API

**Non-goals (spike):** Tests, production polish, security hardening, separate subdomain hosting.

---

## Task 1: Install react-runner

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

```bash
npm install react-runner
```

**Step 2: Verify it installed**

```bash
node -e "require('react-runner')"
```

Expected: No error.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "spike: add react-runner dependency"
```

---

## Task 2: Create the sandbox route (iframe runtime)

The core of the spike — a Next.js page that serves as the iframe runtime. It loads react-runner, pre-loads all available libraries into scope, and communicates with the host via postMessage.

**Files:**
- Create: `app/sandbox/page.tsx`

**Step 1: Create the sandbox page**

This page:
- Loads Tailwind Play CDN via `<Script>` tag
- Sets up react-runner with a `scope` containing all shadcn components, Lucide icons, and React hooks
- Provides a `useAppState` hook that syncs state to the host via postMessage
- Listens for `init`, `call`, and `stateUpdate` messages from the host
- Wraps rendering in an error boundary that reports to the host

Key implementation details:

```tsx
// app/sandbox/page.tsx
'use client'

import { Runner } from 'react-runner'
import Script from 'next/script'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// Import all shadcn components to put in scope
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// ... etc — full shadcn set

// Import Lucide icons
import * as LucideIcons from 'lucide-react'

// The scope object makes everything available to generated code without imports
const baseScope = {
  useState, useEffect, useCallback, useMemo, useRef,
  // ... all shadcn components
  Button, Input, /* etc */
  // ... all Lucide icons
  ...LucideIcons,
}
```

The `useAppState` hook is the bridge between iframe state and host entity state:

```tsx
function useAppState(initialState) {
  const [state, setStateInternal] = useState(initialState)

  // On mount, replace with state from host if provided
  useEffect(() => {
    // Listen for stateUpdate messages from host
    const handler = (e) => {
      if (e.data?.type === 'stateUpdate') {
        setStateInternal(e.data.state)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const setState = useCallback((updater) => {
    setStateInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // Sync to host
      window.parent.postMessage({ type: 'stateSync', state: next }, '*')
      return next
    })
  }, [])

  return [state, setState]
}
```

The main sandbox component:

```tsx
export default function SandboxPage() {
  const [code, setCode] = useState('')
  const [initialState, setInitialState] = useState({})
  const [error, setError] = useState(null)
  // action handler registry for call messages
  const actionHandlersRef = useRef({})

  // Listen for init message from host
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'init') {
        setCode(e.data.code)
        setInitialState(e.data.state ?? {})
        setError(null)
      }
      if (e.data?.type === 'call') {
        // TODO: route to registered action handler
      }
    }
    window.addEventListener('message', handler)
    window.parent.postMessage({ type: 'ready' }, '*')
    return () => window.removeEventListener('message', handler)
  }, [])

  // Build scope with useAppState that uses initialState
  const scope = useMemo(() => ({
    ...baseScope,
    useAppState: (defaults) => useAppState({ ...defaults, ...initialState }),
  }), [initialState])

  if (!code) return null

  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <Runner
        code={code}
        scope={scope}
        onRendered={(error) => {
          if (error) {
            setError(error)
            window.parent.postMessage({
              type: 'error',
              message: error.message,
              stack: error.stack,
            }, '*')
          }
        }}
      />
    </>
  )
}
```

**Important notes for the implementer:**
- Read `apps/_types.ts` for the `ToolSchema` type (used in `_schema`)
- Read `components/ui/` directory to find all available shadcn components — import every one into scope
- The `useAppState` hook must handle both function updaters and direct values (like React's `useState`)
- Tailwind Play CDN URL: `https://cdn.tailwindcss.com` — loads at page level, scans DOM for classes
- The `call` message handler needs to work with the generated code's action handlers. The simplest approach: the generated code registers handlers via a `useActions` hook that writes to a ref the parent can invoke.

**Step 2: Verify it renders**

Start the dev server and navigate to `http://localhost:3000/sandbox`. Should see a blank page. Open devtools console and run:

```js
window.postMessage({ type: 'init', code: 'function App() { return <div className="p-4 text-xl">Hello from sandbox</div> }', state: {} }, '*')
```

Should see "Hello from sandbox" rendered with Tailwind padding.

**Step 3: Commit**

```bash
git add app/sandbox/page.tsx
git commit -m "spike: create sandbox iframe runtime with react-runner"
```

---

## Task 3: Create IframeSandbox host component

The host-side component that manages the iframe and postMessage bridge.

**Files:**
- Create: `core/entity/IframeSandbox.tsx`

**Step 1: Create the component**

```tsx
// core/entity/IframeSandbox.tsx
'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

interface IframeSandboxProps {
  entity: Entity
}

export function IframeSandbox({ entity }: IframeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const updateState = useEntityStore((s) => s.updateState)
  const readyRef = useRef(false)

  const code = entity.state?._code as string | undefined
  const meta = entity.state?._meta as { name?: string } | undefined

  // Send init when iframe is ready
  const sendInit = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !code) return
    // Extract runtime state (everything except _ prefixed keys)
    const runtimeState: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(entity.state ?? {})) {
      if (!k.startsWith('_')) runtimeState[k] = v
    }
    iframeRef.current.contentWindow.postMessage({
      type: 'init',
      code,
      state: runtimeState,
    }, '*')
  }, [code, entity.state])

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Only accept messages from our iframe
      if (e.source !== iframeRef.current?.contentWindow) return

      switch (e.data?.type) {
        case 'ready':
          readyRef.current = true
          sendInit()
          break

        case 'stateSync': {
          // Merge runtime state with system keys
          const currentState = useEntityStore.getState().entities[entity.id]?.state ?? {}
          const systemKeys: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(currentState)) {
            if (k.startsWith('_')) systemKeys[k] = v
          }
          const newState = { ...systemKeys, ...e.data.state }
          const summary = meta?.name ?? entity.summary
          updateState(entity.id, newState, summary)
          break
        }

        case 'error':
          console.error('[IframeSandbox] Error from iframe:', e.data.message)
          break

        case 'callResult':
          // TODO: resolve pending call promise
          break
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [entity.id, meta?.name, entity.summary, updateState, sendInit])

  // Re-send init when code changes (hot reload)
  useEffect(() => {
    if (readyRef.current) sendInit()
  }, [code, sendInit])

  return (
    <iframe
      ref={iframeRef}
      src="/sandbox"
      sandbox="allow-scripts"
      className="w-full h-full border-0"
      title={meta?.name ?? 'Generated App'}
    />
  )
}
```

**Key details:**
- Runtime state = entity.state minus `_`-prefixed keys (system data stays host-side)
- State sync merges iframe's runtime state with preserved system keys
- Hot reload: when `_code` changes in entity.state (from `update_app` via CDC), re-sends `init`
- `sandbox="allow-scripts"` — no same-origin, no popups, no forms

**Step 2: Commit**

```bash
git add core/entity/IframeSandbox.tsx
git commit -m "spike: add IframeSandbox host component with postMessage bridge"
```

---

## Task 4: Wire IframeSandbox into AppRenderer

Make AppRenderer detect generated apps and render IframeSandbox instead of looking up a system app.

**Files:**
- Modify: `core/entity/AppRenderer.tsx` (lines 69-102)

**Step 1: Add the generated app branch**

In `AppRenderer`, after looking up the system app and before the fallback renderers, add a check for generated apps:

```tsx
// After line 77: const app = getAppType(entity.type)
// Before line 91: const content = app ? (...)

// Check for generated app (has _code in state)
const isGenerated = typeof entity.state?._code === 'string'
```

Then update the content selection:

```tsx
const content = app ? (
  <app.component entityId={entity.id} state={entity.state} dispatch={dispatch} mode={mode} />
) : isGenerated ? (
  <IframeSandbox entity={entity} />
) : entity.type === 'image' ? (
  <ImageRenderer entity={entity} />
) : entity.type === 'note' ? (
  <NoteRenderer entity={entity} />
) : (
  <FallbackRenderer entity={entity} />
)
```

Import `IframeSandbox` at the top of the file.

**Step 2: Commit**

```bash
git add core/entity/AppRenderer.tsx
git commit -m "spike: wire IframeSandbox into AppRenderer for generated apps"
```

---

## Task 5: Extend schema/call API routes for generated apps

Currently, schema and call routes only work with system apps (`getAppType`). Extend them to handle generated apps that store schema in `entity.state._schema`.

**Files:**
- Modify: `app/api/entities/[id]/schema/route.ts` (lines 41-47)
- Modify: `app/api/entities/[id]/call/route.ts` (lines 53-70)

**Step 1: Update schema route**

After the system app lookup fails, check for `_schema` in entity.state:

```typescript
// Replace lines 41-47:
const app = getAppType(entity.type)
if (app?.getSchema) {
  const tools = app.getSchema(entity.state ?? {})
  return NextResponse.json({ entity_id: id, type: entity.type, tools })
}

// Generated app: read static schema from state
const schema = entity.state?._schema as Array<Record<string, unknown>> | undefined
if (schema && Array.isArray(schema)) {
  return NextResponse.json({ entity_id: id, type: entity.type, tools: schema })
}

return NextResponse.json({ error: 'no_schema', type: entity.type }, { status: 422 })
```

**Step 2: Update call route**

The call route needs a different approach for generated apps. For system apps, it runs `reduce()` server-side. For generated apps, the "reduce" logic lives in the iframe — but the iframe might not be open. Two options:

**Option A (simpler, for spike):** Write the tool call directly to entity.state as a pending action. The iframe picks it up on next render. This is lossy (no return value) but simple.

**Option B (spike-appropriate):** For generated apps, write the params directly into entity.state. The agent's tool call IS the state mutation — no reduce needed.

Go with Option B for the spike. The agent's `call_entity_tool` on a generated app performs a merge-patch on the runtime state:

```typescript
// After the system app path (line 53-89), add generated app path:
const app = getAppType(entity.type)

if (app?.getSchema) {
  // ... existing system app code (lines 53-89) ...
} else if (entity.state?._schema) {
  // Generated app: merge params into runtime state
  const currentState = entity.state ?? {}
  const runtimeState: Record<string, unknown> = {}
  const systemKeys: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(currentState)) {
    if (k.startsWith('_')) systemKeys[k] = v
    else runtimeState[k] = v
  }

  // Apply tool params as state patch
  const newRuntime = { ...runtimeState, ...(toolParams ?? {}) }
  const newState = { ...systemKeys, ...newRuntime }

  const serviceClient = getSupabaseServiceClient()
  const { error: writeError } = await serviceClient
    .from('entities')
    .update({ state: newState })
    .eq('id', id)

  if (writeError) {
    return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result: newRuntime })
} else {
  return NextResponse.json({ error: 'no_schema', type: entity.type }, { status: 422 })
}
```

**Step 3: Commit**

```bash
git add app/api/entities/[id]/schema/route.ts app/api/entities/[id]/call/route.ts
git commit -m "spike: extend schema/call API for generated apps"
```

---

## Task 6: Dock and window integration for generated apps

Generated apps need to appear in the dock and have proper window titles/icons.

**Files:**
- Modify: `apps/_registry.ts` (add `getGeneratedApps` function)
- Modify: `core/canvas/SpaceRenderer.tsx` (dock rendering)
- Possibly modify window chrome component (wherever title/icon are rendered)

**Step 1: Explore window chrome**

First, read the window component to understand where entity title/icon are displayed. Look at:
- `core/canvas/Window.tsx` or `core/entity/Window.tsx`
- How the window header renders entity summary vs app name

The window likely already reads `entity.summary` for the title. For generated apps, the summary should be set to `_meta.name` by the agent's `build_app` handler.

For the dock icon: generated apps should appear in the dock alongside system apps. Read `core/canvas/SpaceRenderer.tsx` to see how dock items are built (lines 34-68). Generated apps come from the entity store (entities with `_code` in state), not from the registry.

```tsx
// In SpaceRenderer, alongside getDockApps():
const generatedEntities = useEntityStore(s =>
  Object.values(s.entities).filter(e => typeof e.state?._code === 'string' && !e.archived)
)
```

Build dock items from these entities using `_meta.icon` for the Lucide icon lookup (same pattern as the previous spike — use `icons` map from `lucide-react`).

**Step 2: Commit**

```bash
git add core/canvas/SpaceRenderer.tsx
git commit -m "spike: show generated apps in dock with dynamic icons"
```

---

## Task 7: Agent-side — build_app and update_app tools (Python)

Switch to the Domus-Agent repo. Add the new tools for iframe-based app generation.

**Files (Domus-Agent repo):**
- Modify: `agent/tools.py` — update `build_app` tool definition and handler, add `update_app`
- Modify: `agent/builder.py` — rewrite builder for React code generation
- Create: `agent/prompts/iframe_builder.py` — new builder prompt for React + shadcn

**Step 1: Update build_app tool definition in tools.py**

Replace the existing `build_app` definition (lines 215-239) with the new one:

```python
{
    "name": "build_app",
    "description": (
        "Generate a custom interactive app using React and shadcn/ui. "
        "The app renders in a sandboxed iframe. Write the component code, "
        "define the MCP tool schema, and set initial state. "
        "After building, use get_entity_schema and call_entity_tool to test it, "
        "then use update_app to improve it."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "App display name, e.g. 'Calculator'",
            },
            "icon": {
                "type": "string",
                "description": "Lucide icon name in kebab-case, e.g. 'calculator'",
            },
            "description": {
                "type": "string",
                "description": "Brief description of what the app does",
            },
            "code": {
                "type": "string",
                "description": (
                    "React component source code (JSX). Must export a default function App(). "
                    "Available in scope without imports: React hooks (useState, useEffect, etc), "
                    "all shadcn/ui components (Button, Input, Card, etc), all Lucide icons, "
                    "and useAppState(defaultState) which returns [state, setState]."
                ),
            },
            "schema": {
                "type": "array",
                "description": "MCP tool schemas the app exposes to the agent",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "inputSchema": {"type": "object"},
                    },
                    "required": ["name", "description", "inputSchema"],
                },
            },
            "initial_state": {
                "type": "object",
                "description": "Initial runtime state for the app",
            },
            "width": {"type": "integer", "default": 400},
            "height": {"type": "integer", "default": 500},
        },
        "required": ["name", "icon", "description", "code", "schema", "initial_state"],
    },
}
```

**Step 2: Add update_app tool definition**

Add after build_app in `TOOL_DEFINITIONS`:

```python
{
    "name": "update_app",
    "description": (
        "Update a generated app's code, schema, or state. Use after build_app "
        "to iterate and improve the app. Only provided fields are updated."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "entity_id": {
                "type": "string",
                "description": "ID of the generated app entity to update",
            },
            "code": {
                "type": "string",
                "description": "Updated React component source code",
            },
            "schema": {
                "type": "array",
                "description": "Updated MCP tool schemas",
            },
            "state_patch": {
                "type": "object",
                "description": "Runtime state keys to update (merge patch)",
            },
        },
        "required": ["entity_id"],
    },
}
```

**Step 3: Implement build_app handler**

Replace the existing `build_app` function in tools.py (lines 526-561):

```python
async def build_app(client, space_id: str, user_id: str, params: dict) -> dict:
    """Create a generated app entity with React code, schema, and initial state."""
    import uuid

    state = {
        "_code": params["code"],
        "_schema": params["schema"],
        "_meta": {
            "name": params["name"],
            "icon": params["icon"],
            "description": params.get("description", ""),
        },
        **params.get("initial_state", {}),
    }

    row = {
        "space_id": space_id,
        "user_id": user_id,
        "type": "app",
        "content": "",
        "presentation": "window",
        "position": params.get("position", {"x": 100, "y": 100, "locked": False}),
        "size": {
            "width": params.get("width", 400),
            "height": params.get("height", 500),
        },
        "state": state,
        "summary": params["name"],
        "created_by": "agent",
    }

    result = await client.table("entities").insert(row).execute()
    entity = result.data[0] if result.data else row
    return {"ok": True, "entity_id": entity.get("id", ""), "name": params["name"]}
```

**Step 4: Implement update_app handler**

Add after build_app:

```python
async def update_app(client, space_id: str, user_id: str, params: dict) -> dict:
    """Update a generated app's code, schema, or state."""
    entity_id = params["entity_id"]

    # Read current state
    result = await (
        client.table("entities")
        .select("state")
        .eq("id", entity_id)
        .eq("space_id", space_id)
        .maybe_single()
        .execute()
    )
    if not result.data:
        return {"error": "not_found", "id": entity_id}

    current_state = result.data.get("state", {}) or {}

    # Apply updates
    if "code" in params:
        current_state["_code"] = params["code"]
    if "schema" in params:
        current_state["_schema"] = params["schema"]
    if "state_patch" in params:
        for k, v in params["state_patch"].items():
            if not k.startswith("_"):  # Don't allow patching system keys
                current_state[k] = v

    await (
        client.table("entities")
        .update({"state": current_state})
        .eq("id", entity_id)
        .eq("space_id", space_id)
        .execute()
    )

    return {"ok": True, "entity_id": entity_id}
```

**Step 5: Register both in the dispatcher**

Update `execute_tool()` dispatcher (line 571-579):

```python
tools = {
    "create_entity": create_entity,
    "read_entity": read_entity,
    "query_entities": query_entities,
    "update_entity": update_entity,
    "get_entity_schema": get_entity_schema,
    "call_entity_tool": call_entity_tool,
    "build_app": build_app,
    "update_app": update_app,  # NEW
}
```

**Step 6: Commit**

```bash
cd /path/to/Domus-Agent
git add agent/tools.py
git commit -m "spike: add build_app and update_app tools for iframe sandbox"
```

---

## Task 8: Agent-side — builder system prompt

Create the system prompt that tells the agent how to generate React + shadcn/ui code for the `build_app` tool.

**Files (Domus-Agent repo):**
- Create: `agent/prompts/iframe_builder.py`
- Modify: `agent/prompts/system.py` — include iframe builder instructions in the agent's system prompt

**Step 1: Create the iframe builder prompt**

```python
# agent/prompts/iframe_builder.py

IFRAME_BUILDER_CONTEXT = """
## Building Custom Apps

You can create interactive apps using `build_app`. Apps are React components rendered
in a sandboxed iframe with these libraries available (no imports needed):

### Available Hooks
- `useAppState(defaults)` → `[state, setState]` — like useState but synced to the entity.
  Use function updater: `setState(prev => ({ ...prev, count: prev.count + 1 }))`
- `useState`, `useEffect`, `useCallback`, `useMemo`, `useRef` — standard React hooks

### Available Components (shadcn/ui)
Button, Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent,
SelectItem, Checkbox, Switch, Slider, RadioGroup, RadioGroupItem, Card, CardHeader,
CardTitle, CardDescription, CardContent, CardFooter, Badge, Separator, ScrollArea,
Tabs, TabsList, TabsTrigger, TabsContent, Dialog, DialogTrigger, DialogContent,
DialogHeader, DialogTitle, DialogDescription, Table, TableHeader, TableRow,
TableHead, TableBody, TableCell, Tooltip, TooltipTrigger, TooltipContent,
TooltipProvider, Progress, Alert, AlertTitle, AlertDescription

### Available Icons
All Lucide React icons are in scope. Use PascalCase: `<Calculator />`, `<Plus />`, etc.

### Styling
Use Tailwind CSS classes. The full Tailwind utility set is available.
Use the design system tokens: `bg-surface`, `text-on-surface`, `bg-primary`, etc.

### Code Structure
Your code must define a function called `App`:

```jsx
function App() {
  const [state, setState] = useAppState({ count: 0 })

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{state.count}</h2>
      <Button onClick={() => setState(s => ({ ...s, count: s.count + 1 }))}>
        Increment
      </Button>
    </div>
  )
}
```

### Schema Definition
Define tools the agent can call to interact with the app:

```json
[
  {
    "name": "set_count",
    "description": "Set the counter value",
    "inputSchema": {
      "type": "object",
      "properties": {
        "count": { "type": "number", "description": "New count value" }
      },
      "required": ["count"]
    }
  }
]
```

### Guidelines
- Keep code in a single `App` function (no separate component files)
- Use `useAppState` for all persistent state, `useState` for ephemeral UI state only
- Use grid/flexbox for layout — you have full CSS capabilities
- Size: apps are typically 400x500px. Design accordingly.
- After building, use `get_entity_schema` and `call_entity_tool` to TEST your app.
  Then use `update_app` to fix any issues.
"""
```

**Step 2: Include in agent system prompt**

Add `IFRAME_BUILDER_CONTEXT` to the system prompt assembly in `agent/prompts/system.py`. Find where the system prompt is built and append this context.

**Step 3: Commit**

```bash
git add agent/prompts/iframe_builder.py agent/prompts/system.py
git commit -m "spike: add iframe builder prompt for React + shadcn code generation"
```

---

## Task 9: End-to-end test — manual verification

This is not automated tests — it's the manual verification that the full pipeline works.

**Steps:**

1. **Start the frontend:**
   ```bash
   cd /path/to/Domus/.worktrees/spike-iframe-sandbox
   npm run dev
   ```

2. **Start the agent:**
   ```bash
   cd /path/to/Domus-Agent
   uvicorn main:app --reload
   ```

3. **In the Domus UI, ask the agent:** "Build me a calculator"

4. **Verify:**
   - [ ] Agent calls `build_app` with React code
   - [ ] Entity appears with `_code` in state
   - [ ] Window opens with iframe rendering the calculator
   - [ ] Calculator buttons work (grid layout, not stacked)
   - [ ] State persists on page refresh
   - [ ] Agent can call tools via schema/call API
   - [ ] Agent can call `update_app` to revise the calculator

5. **Measure (exit criteria from spike plan):**
   - [ ] How large is the iframe bundle?
   - [ ] How fast does it render?

6. **Record findings** in `spikes/2026-02-20-iframe-sandbox/findings.md`

---

## Task Summary

| Task | Area | Description |
|------|------|-------------|
| 1 | Frontend | Install react-runner |
| 2 | Frontend | Create `/sandbox` route (iframe runtime) |
| 3 | Frontend | Create `IframeSandbox` host component |
| 4 | Frontend | Wire into `AppRenderer` |
| 5 | Frontend | Extend schema/call API routes |
| 6 | Frontend | Dock + window integration |
| 7 | Agent | `build_app` + `update_app` tools |
| 8 | Agent | Builder system prompt |
| 9 | Both | End-to-end manual verification |

Tasks 1-6 are frontend (this repo). Tasks 7-8 are agent (Domus-Agent repo). Task 9 is integration testing.

Tasks 1-6 can be done sequentially in this worktree. Tasks 7-8 can be done in parallel (different repo). Task 9 requires both to be running.
