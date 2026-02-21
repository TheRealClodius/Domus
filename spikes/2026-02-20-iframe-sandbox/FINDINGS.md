# Iframe Sandbox Spike Findings

**Question:** Can the agent generate React + shadcn/ui code that renders inside an iframe sandbox, with state persistence, schema exposure, and full agent interop — making generated apps indistinguishable from system apps?

**Answer:** Yes. End-to-end working.

**Date:** 2026-02-20 to 2026-02-21

---

## What Was Built

1. **Sandbox runtime** (`app/sandbox/page.tsx`) — iframe page using `react-runner` (Sucrase-based JSX compilation). Scope includes all `core/ui/` components, all 1500+ Lucide icons, React hooks, and a custom `useAppState` hook for state sync. Tailwind safelist ensures runtime-generated classes compile correctly.

2. **Host bridge** (`core/entity/IframeSandbox.tsx`) — postMessage-based communication between host and iframe. Handles init, stateSync, call/callResult, error, and ready messages.

3. **AppRenderer integration** — detects `_code` in entity.state, renders IframeSandbox instead of system app component. Generated apps live alongside system apps seamlessly.

4. **Schema/call API extension** — `/api/entities/[id]/schema` reads `_schema` from entity.state. `/api/entities/[id]/call` does merge-patch on runtime state. Agent sees generated apps identically to system apps.

5. **Dock + window integration** — generated apps appear in dock with Lucide icons, windows show custom title/icon from `_meta`.

6. **Agent tools** (`build_app`, `update_app`) — agent creates entities with `_code`, `_schema`, `_meta`, and initial state. Can iterate on apps with `update_app`.

7. **Builder system prompt** — documents available components, hooks, styling, schema format, and provides calculator example.

## E2E Test Results

### Prompt: "Build me a calculator app"

- Agent generated a full calculator with grid layout, display, and 20 buttons
- Calculator rendered in iframe window with title "Calculator" and grid icon
- Appeared in dock automatically
- **Arithmetic works:** 7 + 3 = 10 (verified via Playwright)
- **State persists:** page refresh preserved "10" on display
- **Agent response time:** ~30s total (includes Claude thinking + entity creation)

### Prompt: "Build me a Pomodoro timer"

- Circular timer display with Work/Break tabs, reset/pause controls
- Trophy icon and session counter
- All Lucide icons available (fixed — see Tailwind and Icons sections below)

### Prompt: "Build me a habit tracker"

- Weekly grid (Sun–Today) with 5 default habits and per-day checkboxes
- Habit icons (Brain, Dumbbell, BookOpen, Droplets, Moon) rendered correctly
- "Add" button, "Today's habits" section with completion toggles
- Design tokens applied correctly: `bg-surface-lowest`, `bg-surface-low`, `bg-primary`

## Known Issues

### 1. Font CORS errors (cosmetic)
`sandbox="allow-scripts"` without `allow-same-origin` blocks cross-origin font loading. The iframe falls back to system fonts. Fix: either serve fonts from same origin, or inline font data, or add `allow-same-origin` (security tradeoff).

### 2. localStorage SecurityError (cosmetic)
The Next.js layout.tsx theme script calls `localStorage.getItem()` which throws in sandboxed iframe without `allow-same-origin`. Doesn't affect functionality — the sandbox page should have its own minimal layout that skips theme init.

### 3. react-runner peer dep mismatch
`react-runner@1.0.5` declares `react@"^16 || ^17 || ^18"` but Domus uses React 19. Installed with `--legacy-peer-deps`. Works fine at runtime. For production: either fork react-runner, pin version, or wait for upstream update.

### 4. Display contrast
Calculator display text appears light/low-contrast in current styling. Agent-generated CSS could be improved — this is a prompt engineering issue, not a platform issue.

### 5. Tailwind v4 doesn't see runtime classes
Tailwind v4 compiles CSS at build time by scanning source files. Classes in generated code (delivered via postMessage at runtime) produce no CSS output. Fix: `TAILWIND_SAFELIST` constant in `app/sandbox/page.tsx` — a hidden div referencing ~100 lines of commonly-needed utility classes forces Tailwind to compile them. Without this, `grid-cols-4` etc. silently fail (elements render but in single column).

### 6. Lucide icon availability
The builder prompt tells the agent "all Lucide icons are in scope" but originally only ~70 manually-listed icons were available. Any icon the agent used outside that set caused a `ReferenceError` crash (e.g. `Trophy is not defined`). Fix: `import { icons } from 'lucide-react'` — a single object containing all 1500+ icons. Spread into scope first so UI components with the same name (Sheet, Switch) override correctly.

### 7. Agent can't delete entities
The agent has 5 tools: `create_entity`, `update_entity`, `query_entities`, `read_entity`, `web_search`. No delete capability. When asked to "delete the calculator app", the agent responds affirmatively but nothing happens — the apps remain in the dock. Not a blocker for the spike; entity deletion is a broader product decision (soft-delete, archive, etc.).

## Architecture Decisions Validated

| Decision | Status | Notes |
|----------|--------|-------|
| react-runner over Sandpack | Validated | Lightweight, fast, no bundler overhead |
| Local state + sync (not host-owned) | Validated | Works naturally, state persists via entity |
| Static `_schema` in entity.state | Validated | Agent can read schemas without iframe running |
| Dedicated /sandbox route | Validated | Clean separation, Next.js page with full scope |
| postMessage bridge | Validated | Init/sync/call protocol works reliably |
| `_`-prefixed system keys | Validated | Clean separation of system vs runtime state |

## Implications for Production

1. **This approach is viable.** The core architecture (react-runner + iframe sandbox + postMessage bridge + entity state) works end-to-end.

2. **Security model needs refinement.** Current `sandbox="allow-scripts"` is secure but breaks fonts and localStorage. Production might need `allow-same-origin` with CSP headers, or a separate origin for the sandbox.

3. **Component library is expanding.** Agent can use Button, Input, Slider, Switch, Dialog, Tooltip, Sheet, ContextMenu, MenuCard, and all 1500+ Lucide icons. More shadcn/ui components can be added to scope as needed.

4. **Builder prompt quality matters enormously.** Rewriting the builder prompt with full design system knowledge (semantic tokens, typography rules, layout patterns, visual checklist) transformed output from "functional but ugly" to "polished and cohesive". The prompt is the primary lever for app quality.

5. **Hot reload works.** When `_code` changes, IframeSandbox re-sends init, and the iframe recompiles + re-renders. This enables the agent to iterate on generated apps.

## Gotchas

- `react-runner`'s `useRunner` hook requires the code to define a function called `App` (or whatever the scope expects). The builder prompt must enforce this.
- The iframe's `useAppState` hook uses a mutable ref pattern to avoid stale closures in the postMessage handler. This is essential — without it, state updates would reference stale React state.
- Entity state merging must preserve `_`-prefixed keys (code, schema, meta) while allowing runtime state to sync freely. Both host and API routes implement this filtering.
- Tailwind v4 is build-time only — any class that doesn't appear in source files gets no CSS. Runtime-generated apps need a safelist.
- When spreading `icons` into scope alongside UI components, icons must come first so that UI components with the same name (e.g. `Sheet`, `Switch`) override the Lucide icon.
