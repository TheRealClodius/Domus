# Iframe Sandbox for Runtime App Generation

## Date
2026-02-20

## Goal
User says "build me a calculator" → agent generates a working React app → it renders in a sandboxed iframe → state persists → agent can interact with it like any other entity.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compilation | react-runner (Sucrase) in iframe | Claude Artifacts model — proven at scale, ~275KB, no server roundtrip |
| Fallback | Sandpack if react-runner hits limits | Heavier (~2MB) but handles complex scenarios |
| Component set | Full shadcn/ui | Agent already knows the API — no artificial limits |
| State model | Local state in iframe + sync to host | Natural React code, zero interaction latency, safe (no eval in host) |
| Schema | Static in entity.state._schema | Always available to agent even when iframe is closed |
| Iframe hosting | Dedicated /sandbox route | Browser caches runtime across apps; cleaner than srcdoc |
| Agent interaction | Same as system apps (schema/call) | Generated apps are first-class — agent makes no distinction |
| Iteration | build_app + update_app tools | Agent can review, test (via schema/call), and revise |

## Entity Shape

```typescript
interface GeneratedAppState {
  // System keys (set by build_app, not touched by iframe sync)
  _code: string          // React JSX source (single component)
  _schema: ToolSchema[]  // MCP-compatible tool definitions
  _meta: {
    name: string         // "Calculator", "Todo List"
    icon: string         // Lucide icon name (kebab-case)
    description: string  // For agent context
  }

  // Runtime state (managed by iframe, synced to host)
  [key: string]: unknown // e.g., count: 0, items: [], display: "0"
}
```

Entity uses existing `app` type with `subtype: "generated"`.

## Sandbox Runtime

`/app/sandbox/page.tsx` — a Next.js page that serves as the iframe runtime.

### Pre-loaded dependencies
- React 19 (bundled)
- Full shadcn/ui component set (pre-imported into react-runner scope)
- Tailwind Play CDN (loaded via `<script>` tag)
- Lucide React icons (full set in scope)
- react-runner (Sucrase-based JSX compiler)

### Scope injection
Generated code needs no imports. Everything is available via react-runner's `scope`:

```typescript
const scope = {
  // React hooks
  useState, useEffect, useCallback, useMemo, useRef,
  // shadcn/ui
  Button, Input, Label, Card, CardContent, /* ... full set ... */
  // Lucide icons
  ...allLucideIcons,
  // Bridge
  useAppState,   // hook: returns [state, setState] synced to host
  dispatch,      // function: sends action to host for schema/call
}
```

### Generated code example

```jsx
function App() {
  const [state, setState] = useAppState({ display: "0", memory: 0 })

  const press = (key) => {
    setState(s => ({ ...s, display: s.display + key }))
  }

  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      <div className="col-span-4 text-right text-2xl p-2 bg-muted rounded">
        {state.display}
      </div>
      {["7","8","9","+","4","5","6","-","1","2","3","*","0",".","=","/"].map(k => (
        <Button key={k} onClick={() => press(k)}>{k}</Button>
      ))}
    </div>
  )
}
```

## PostMessage Bridge Protocol

### Host → Iframe

| Message | When | Payload |
|---------|------|---------|
| `init` | iframe posts `ready` | `{ code: string, state: object }` |
| `call` | agent calls tool via /call endpoint | `{ callId: string, action: string, params: object }` |
| `stateUpdate` | agent writes state directly | `{ state: object }` |

### Iframe → Host

| Message | When | Payload |
|---------|------|---------|
| `ready` | iframe runtime loaded | `{}` |
| `stateSync` | useAppState setter called | `{ state: object }` |
| `callResult` | after handling a `call` | `{ callId: string, result: object }` |
| `error` | render/runtime error caught | `{ message: string, stack?: string }` |

### Flow: User interaction
```
User clicks button → setState in iframe → React re-renders instantly
                   → stateSync posted to host → host updates entity.state → Supabase
```

### Flow: Agent tool call
```
Agent → POST /api/entities/[id]/call { tool: "press_key", params: { key: "7" } }
Host → postMessage to iframe: { type: "call", callId, action, params }
Iframe → handles action → postMessage: { type: "callResult", callId, result }
Host → responds to agent API call with result
```

## Agent Tools

### build_app
Creates a new generated app entity.

```python
{
    "name": "build_app",
    "input_schema": {
        "properties": {
            "name": { "type": "string" },
            "icon": { "type": "string", "description": "Lucide icon name (kebab-case)" },
            "code": { "type": "string", "description": "React JSX component source" },
            "schema": { "type": "array", "description": "MCP tool schemas" },
            "initial_state": { "type": "object" },
            "width": { "type": "integer", "default": 400 },
            "height": { "type": "integer", "default": 500 }
        },
        "required": ["name", "icon", "code", "schema", "initial_state"]
    }
}
```

### update_app
Revises an existing generated app.

```python
{
    "name": "update_app",
    "input_schema": {
        "properties": {
            "entity_id": { "type": "string" },
            "code": { "type": "string" },
            "schema": { "type": "array" },
            "state_patch": { "type": "object" }
        },
        "required": ["entity_id"]
    }
}
```

### Iteration flow
```
User: "Build me a calculator"
Agent: build_app → entity created → iframe renders
Agent: get_entity_schema → sees tools → calls them to test
Agent: "Layout needs work" → update_app with revised code → iframe hot-reloads
Agent: "Done — calculator working with grid layout"
```

## Host Integration

### Rendering
```
SpaceRenderer → EntityRenderer → AppRenderer
  ├── System app (type in registry) → <app.component state={...} dispatch={...} />
  └── Generated app (subtype === "generated") → <IframeSandbox entity={entity} />
```

### IframeSandbox component
- Renders `<iframe src="/sandbox" sandbox="allow-scripts">`
- Sends `init` on iframe `ready`
- Listens for `stateSync` → updates entity.state in store → Supabase
- Listens for `error` → shows fallback in window chrome
- Forwards `call`/`callResult` between API and iframe

### Schema/Call API
- `GET /api/entities/[id]/schema` — reads `entity.state._schema` directly (no iframe)
- `POST /api/entities/[id]/call` — routes through IframeSandbox component to iframe

### Window integration
- Title: `entity.state._meta.name`
- Icon: `entity.state._meta.icon` (Lucide lookup)
- Dock: appears alongside system apps

### Hot reload
When `entity.state._code` changes (CDC from `update_app`), IframeSandbox re-sends `init` with new code. Iframe re-compiles and re-renders.

## Security

- `sandbox="allow-scripts"` — scripts run, but no same-origin access, no popups, no forms
- No `allow-same-origin` — iframe can't access host cookies/localStorage
- Error boundary catches crashes inside iframe
- Upgrade path: separate subdomain for production (maximum isolation)

## Research Sources
- [Reverse Engineering Claude Artifacts](https://www.reidbarber.com/blog/reverse-engineering-claude-artifacts) — iframe + react-runner + postMessage architecture
- [Vercel: Running AI-Generated Code in Sandbox](https://vercel.com/guides/running-ai-generated-code-sandbox) — server-side VM approach (not chosen)
- [Sandpack Architecture](https://sandpack.codesandbox.io/docs/architecture/overview) — in-browser bundler (fallback option)
- [Sucrase](https://github.com/alangpierce/sucrase) — JSX compiler used by react-runner
- [Tailwind Play CDN](https://tailwindcss.com/docs/installation/play-cdn) — runtime Tailwind in iframe
