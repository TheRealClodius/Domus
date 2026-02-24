# Spike: Iframe Sandbox with shadcn for Runtime App Generation

## Date
2026-02-20

## Question
Can the agent generate React + shadcn/ui code that renders inside an iframe sandbox, replacing the declarative JSON approach for runtime-generated apps?

## Context
The previous spike (`spike/generated-apps`) proved that agent-generated apps can render via a declarative view tree + action system. However, the declarative approach hit an expressiveness ceiling:
- No 2D layout (grid, columns) — calculator buttons stacked vertically
- 14 component types is restrictive — every new capability needs a catalog entry + renderer wrapper
- Builder prompt must know the catalog vocabulary — can't leverage the agent's existing knowledge of React/HTML/CSS

The declarative approach's main argument was "safety" — but the code author is the user's own agent, not an untrusted third party. The real concerns are **robustness** (crashes, memory leaks, infinite loops), which an iframe sandbox addresses.

## Hypothesis
The agent can generate React + shadcn/ui + Tailwind code in a single `build_app` tool call. The frontend renders it inside a sandboxed iframe with:
- Crash isolation (bad code kills the iframe, not the host)
- A message-passing bridge for state sync (entity.state ↔ iframe)
- Access to shadcn components + Tailwind classes (the agent already knows these well)

## Exit Criteria
1. A minimal iframe sandbox that can render agent-generated React + Tailwind
2. A message-passing bridge: host sends state → iframe renders; iframe dispatches actions → host updates entity
3. One working example: a calculator (or equivalent) with grid layout and working interactions
4. Measured: how large is the iframe bundle? How fast does it render?
5. Identified: what's the minimal set of shadcn components to include?

## Architecture Sketch

```
┌─────────────────────────────────────┐
│  Host (Next.js)                     │
│                                     │
│  Entity { type: 'app', state: {     │
│    _code: "function App() {...}",   │
│    _meta: { name, icon, size },     │
│    count: 0, items: [...]           │
│  }}                                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  <iframe sandbox="...">      │  │
│  │                              │  │
│  │  Renders _code as React      │  │
│  │  Has: shadcn, Tailwind,      │  │
│  │       Lucide icons           │  │
│  │                              │  │
│  │  Receives: state via postMsg │  │
│  │  Sends: dispatch(action, p)  │  │
│  │         via postMsg          │  │
│  └───────────────────────────────┘  │
│                                     │
│  Bridge: postMessage protocol       │
│  - host→iframe: { type: 'state',   │
│                    payload: {...} }  │
│  - iframe→host: { type: 'dispatch', │
│                    action, params }  │
└─────────────────────────────────────┘
```

## Key Questions to Explore
1. **Bundle size**: What's the minimum iframe payload? (React + shadcn subset + Tailwind)
2. **Code compilation**: How to turn agent-generated JSX into runnable code? (Sucrase? SWC? Pre-compiled?)
3. **Tailwind in iframe**: Does Tailwind work in an isolated iframe? (Twind/UnoCSS runtime? Pre-built CSS?)
4. **State bridge**: postMessage latency — is it perceptible?
5. **Error handling**: How to catch and report errors from the iframe to the host?
6. **Security sandbox**: Which iframe sandbox flags to use? (`allow-scripts` yes, `allow-same-origin` no?)
7. **Hot reload**: Can we update the iframe when the agent revises the code?

## Approach
1. Build a minimal iframe host component (replaces ComposedRenderer)
2. Build the iframe runtime: React + Tailwind + a few shadcn components
3. Wire up postMessage bridge
4. Have the agent generate a calculator — verify grid layout + interactions work
5. Measure bundle size and render speed

## Non-Goals
- Production polish
- Full shadcn component set (pick 10-15 most useful)
- Tests
- Agent-side changes (reuse existing build_app tool, just change what it generates)
