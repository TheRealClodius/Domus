---
name: create-app
description: Use when building a new built-in Domus app. Guides the full process from requirements through types, tests, components, and registry registration. Invoke with /create-app [app-name].
argument-hint: [app-name]
disable-model-invocation: true
---

Create a new built-in Domus app from scratch — types, tests, components, registry — following the exact contract and patterns used by existing apps.

This skill is self-contained. Do NOT read additional files unless something seems wrong. Everything you need is inlined below.

---

## 1. Input Parsing

Parse `$ARGUMENTS` into:
- **APP_NAME** — PascalCase (e.g., `Timer`, `Pomodoro`, `Kanban`)
- **APP_TYPE** — kebab-case (e.g., `timer`, `pomodoro`, `kanban`)
- **Description** — a one-sentence summary of what the app does

If `$ARGUMENTS` is empty or unclear, ask the user for a name and one-sentence description before proceeding.

---

## 2. Requirements Discovery

Before writing any code, ask these questions **one at a time**. Wait for each answer.

1. **Main interactions** — "What can the user do in this app?" (click, type, toggle, drag, etc.)
2. **Persisted state** — "What should the app remember between sessions?" → derives the `state` shape
3. **Child entities** — "Does this app create/manage its own data items?" (like calendar events, kanban cards) → determines hidden entity pattern
4. **Card mode** — "What should the compact card preview show?" → drives `summarize` and card component
5. **Header actions** — "Does the app need mode switching or controls in the title bar?" → determines `windowActions`

After all questions, present a requirements summary:

```
## Requirements Summary

Name: [APP_NAME]
Type: [APP_TYPE]
State: { field1: type, field2: type, ... }
Actions: [list of reducer actions with params]
Child entities: [yes/no — if yes, child type name + state shape]
Card preview: [what the card shows]
Window actions: [yes/no — what they do]
Singleton: [yes/no]
```

**Wait for user confirmation before proceeding.**

---

## 3. The BuiltInApp Contract

This is the exact interface from `apps/_types.ts`. Your app's default export must satisfy it.

```typescript
// apps/_types.ts

import { z } from 'zod'
import { ComponentType } from 'react'

export type BuiltInApp<
  TState extends z.ZodObject<any> = z.ZodObject<any>,
  TActions extends Record<string, z.ZodObject<any>> = Record<string, z.ZodObject<any>>,
> = {
  source: 'built-in'
  type: string                                    // unique identifier, matches entity.type
  name: string                                    // human-readable display name
  icon: ComponentType                             // icon component (lucide-react)
  component: ComponentType<AppProps<z.infer<TState>>>  // the React UI

  defaultPresentation: 'window' | 'card' | 'sidebar'
  defaultSize: { width: number; height: number }

  schema: {
    state: TState                                 // Zod schema for entity.state
    actions: TActions                             // named actions for user interactions
  }

  // Frontend-only: (current state, action name, params) => new state
  // User interactions only. The agent writes raw state directly — never calls reduce.
  reduce: (state: z.infer<TState>, action: string, params: any) => z.infer<TState>

  // Frontend-only: generates a one-line summary when the user changes state.
  // The agent writes its own summaries. Both write to entity.summary.
  summarize: (state: z.infer<TState>) => string
}

export type AppProps<TState> = {
  entityId: string
  state: TState
  dispatch: (action: string, params: any) => void
}
```

### Field-by-field:

| Field | Notes |
|-------|-------|
| `source` | Always `'built-in'` |
| `type` | Kebab-case, matches `entity.type` in the DB |
| `name` | Human-readable, shown in App Dock |
| `icon` | A Lucide React icon component (e.g., `Clock`, `Timer`, `Kanban`) |
| `component` | The root React component. Receives `AppProps`. |
| `defaultPresentation` | Usually `'window'`. Use `'card'` for image-heavy, `'sidebar'` for settings-like |
| `defaultSize` | `{ width, height }` in pixels. Start with `{ width: 480, height: 520 }` and adjust |
| `schema.state` | Zod object describing the state shape. Used by the agent to understand the app |
| `schema.actions` | Zod objects for each user action's params |
| `reduce` | Pure function. Must handle empty `{}` state (apply defaults first). Unknown actions return `state` by reference |
| `summarize` | One-liner for cards + agent context. Must handle empty `{}` state without crashing |

### Entity interface (from `lib/types.ts`):

```typescript
export interface Entity {
  id: string
  space_id: string
  user_id: string
  type: string
  presentation: 'window' | 'card' | 'sidebar' | 'hidden'
  position: { x: number; y: number; locked: boolean }
  size: { width: number; height: number }
  z_index: number
  content: string
  state: Record<string, unknown>
  summary: string
  created_by: 'user' | 'agent'
  archived: boolean
  created_at: string
  updated_at: string
}
```

### Entity store API (from `core/entityStore.ts`):

```typescript
// Reading entity state in a component:
const state = useEntityStore((s) => s.entities[entityId]?.state as MyState)

// Store methods (used in hooks, not directly in components):
useEntityStore.getState().upsert(entity)        // create or update
useEntityStore.getState().getEntity(id)          // read by ID
useEntityStore.getState().updateState(id, patch) // partial state update
```

### ID generation (from `lib/id.ts`):

```typescript
import { ulid } from '@/lib/id'
const newId = ulid() // returns a ULID string
```

---

## 4. Architecture Rules

These are non-negotiable. Violating any one will cause review failure.

1. **Self-contained folders.** Your app lives entirely in `apps/<app-type>/`. Zero imports from other `apps/` folders. Import from `@/core/`, `@/lib/`, and external packages only.

2. **Entity state = persisted, useState = ephemeral.** Anything the user should see after a page refresh goes in entity `state` (via `dispatch`). UI-only concerns (which dropdown is open, hover state, local input buffer) use React `useState`.

3. **Reducer handles empty `{}` state.** When the entity is first created, `state` is `{}`. Your reducer must apply defaults before processing any action:
   ```typescript
   reduce(state, action, params) {
     const s = { ...defaults, ...state }
     // now process action on `s`
   }
   ```

4. **Unknown actions return `state` by reference.** If the action name doesn't match any case, return the original `state` object — not a copy, not `{ ...state }`. This prevents unnecessary re-renders.

5. **Hidden entities for child data.** If your app manages sub-items (like calendar events), store them as separate entities with `presentation: 'hidden'` and the parent's `space_id` + `user_id`. Query them with a custom hook (see `useCalendarEvents` pattern).

6. **IDs use ULID.** Always `import { ulid } from '@/lib/id'` for generating entity IDs. Never use `crypto.randomUUID()` or `Math.random()`.

7. **No toasts, no modals** — except destructive action confirmations (using `Dialog` from `@/core/ui/dialog`). Errors go inline. Success is visual (the entity updates).

8. **`data-testid` on interactive elements.** Every button, input, and meaningful container gets a `data-testid` for testing.

9. **`'use client'` directive.** Every `.tsx` file that uses hooks, event handlers, or browser APIs needs `'use client'` at the top. The `index.ts` definition file does NOT (it's imported at build time).

10. **Entities need `space_id` and `user_id`.** When creating child entities, inherit these from the parent entity. Never hardcode them.

---

## 5. Design Rules

### Color Tokens (Tailwind classes — never use raw hex/rgb)

| Role | Class |
|------|-------|
| Default background | `bg-surface` |
| Elevated (cards, windows) | `bg-surface-raised` |
| Recessed (wells, insets) | `bg-surface-sunken` |
| Primary text | `text-on-surface` |
| Secondary text | `text-on-surface-muted` |
| Borders | `border-outline` |
| Accent (sparingly) | `text-primary`, `bg-primary` |
| Error | `text-error` |

### Typography (Tailwind classes)

| Token | Use |
|-------|-----|
| `text-body` | Default for all UI text (14px) |
| `text-body-sm` | Same as body (14px) |
| `text-body-md` | Slightly larger body (16px) |
| `text-label` | Metadata, timestamps (12px) |
| `text-title-sm` | Section headers (16px) |
| `text-title-md` | Main titles (24px) |
| `font-display` | Display font — titles only |

**No bold body text. No italic emphasis.**

### Spacing

Multiples of 4px only: `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px). Same for `gap-*`, `m-*`.

### Border Radius

| Token | Size | Use |
|-------|------|-----|
| `rounded-xs` | 4px | Small elements, chips |
| `rounded-sm` | 6px | Buttons, inputs |
| `rounded-md` | 10px | Cards, dropdowns |
| `rounded-2xl` | 20px | Windows, bottom sheets |

### Forbidden

- Gradients
- Noise textures
- Raw hex colors
- Custom scrollbars
- Bold or italic body text

### Available UI Components

```typescript
import { Button } from '@/core/ui/button'
// variants: 'pill-base' | 'pill-secondary' | 'pill-active'
// size: 'pill'

import { Input } from '@/core/ui/input'

import { Dialog } from '@/core/ui/dialog'
// destructive confirms only

import { WindowHeaderOptions } from '@/core/entity/WindowHeaderOptions'
// pill button group rendered in the window header's top-right area
```

### Scroll & Surface Rules (critical)

Your app component renders inside the Window chrome's scroll container. The Window provides:

```
overflow-auto scroll-fade pt-10 px-4 pb-10 bg-surface-raised rounded-b-2xl
--scroll-fade-size: 2.5rem
```

What this means:

- **Do NOT add `overflow-auto` at your root level** — the Window already scrolls
- **Do NOT add `bg-surface-raised`** on your app root div — the Window already has it
- **The `scroll-fade` mask** dissolves content at edges. Don't add fixed headers inside the scroll area
- **`pt-10` padding** pushes content below the floating WindowHeader
- **Internal scroll areas are fine** — sub-regions (like a time grid) can use `overflow-auto` on an inner container
- Edge-to-edge content: use negative `mx-4` margins
- For apps with their own fixed header: use `flex flex-col h-full` at root, put the header outside scrolling, let the flex child scroll

---

## 6. Code Templates

Replace all `__APP_TYPE__`, `__APP_NAME__`, `__ICON__` placeholders. These are starting skeletons — adapt to your app's requirements.

### `apps/__APP_TYPE__/types.ts`

```typescript
import { z } from 'zod'

export const __APP_NAME__State = z.object({
  // Define your state fields here
  // Example: title: z.string(), count: z.number()
})

export type __APP_NAME__State = z.infer<typeof __APP_NAME__State>

export const __APP_NAME__Defaults: __APP_NAME__State = {
  // Default values for every field
  // These are applied when state is {} (empty)
}

export const __APP_NAME__Actions = {
  // Define action param schemas
  // Example: increment: z.object({ amount: z.number() })
}
```

### `apps/__APP_TYPE__/index.ts`

```typescript
import { __ICON__ } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import { __APP_NAME__State, __APP_NAME__Defaults, __APP_NAME__Actions } from './types'
import { __APP_NAME__App } from './__APP_NAME__App'

const __APP_TYPE__App: BuiltInApp<typeof __APP_NAME__State, typeof __APP_NAME__Actions> = {
  source: 'built-in',
  type: '__APP_TYPE__',
  name: '__APP_NAME__',
  icon: __ICON__,
  component: __APP_NAME__App,

  defaultPresentation: 'window',
  defaultSize: { width: 480, height: 520 },

  schema: {
    state: __APP_NAME__State,
    actions: __APP_NAME__Actions,
  },

  reduce(state, action, params) {
    const s = { ...__APP_NAME__Defaults, ...state }

    switch (action) {
      // Add cases for each action
      // Example:
      // case 'increment':
      //   return { ...s, count: s.count + (params.amount ?? 1) }

      default:
        return state // return original reference for unknown actions
    }
  },

  summarize(state) {
    const s = { ...__APP_NAME__Defaults, ...state }
    // Return a one-line summary
    // Example: return `Count: ${s.count}`
    return '__APP_NAME__'
  },
}

export default __APP_TYPE__App
```

### `apps/__APP_TYPE__/__APP_NAME__App.tsx`

```typescript
'use client'

import type { AppProps } from '@/apps/_types'
import type { __APP_NAME__State } from './types'
import { __APP_NAME__Defaults } from './types'
// import { __APP_NAME__Card } from './__APP_NAME__Card'

export function __APP_NAME__App({ entityId, state: rawState, dispatch }: AppProps<__APP_NAME__State>) {
  const state = { ...__APP_NAME__Defaults, ...rawState }

  // Uncomment if you have a card mode:
  // if (mode === 'card') return <__APP_NAME__Card state={state} />

  return (
    <div className="flex flex-col gap-3" data-testid="__APP_TYPE__-app">
      {/* App content here */}
    </div>
  )
}
```

### `apps/__APP_TYPE__/__APP_NAME__Card.tsx` (if applicable)

```typescript
'use client'

import type { __APP_NAME__State } from './types'
import { __APP_NAME__Defaults } from './types'

export function __APP_NAME__Card({ state: rawState }: { state: __APP_NAME__State }) {
  const state = { ...__APP_NAME__Defaults, ...rawState }

  return (
    <div className="flex flex-col gap-1 p-3" data-testid="__APP_TYPE__-card">
      {/* Card preview content */}
    </div>
  )
}
```

### `apps/__tests__/__APP_TYPE__.test.ts`

```typescript
import { describe, expect, it, beforeEach } from 'vitest'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'
import app from '@/apps/__APP_TYPE__'

// --- Fixtures ---

function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'test-entity-1',
    space_id: 'space-1',
    user_id: 'user-1',
    type: '__APP_TYPE__',
    presentation: 'window',
    position: { x: 50, y: 50, locked: false },
    size: { width: 480, height: 520 },
    z_index: 1,
    content: '',
    state: {},
    summary: '',
    created_by: 'user',
    archived: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// --- Definition ---

describe('__APP_TYPE__ app definition', () => {
  it('has correct type and source', () => {
    expect(app.type).toBe('__APP_TYPE__')
    expect(app.source).toBe('built-in')
  })

  it('exports required fields', () => {
    expect(app.name).toBeDefined()
    expect(app.icon).toBeDefined()
    expect(app.component).toBeDefined()
    expect(app.schema.state).toBeDefined()
    expect(app.schema.actions).toBeDefined()
    expect(typeof app.reduce).toBe('function')
    expect(typeof app.summarize).toBe('function')
  })
})

// --- Reducer ---

describe('__APP_TYPE__ reducer', () => {
  it('handles empty state by applying defaults', () => {
    const result = app.reduce({}, 'nonexistent', {})
    // Should return state by reference for unknown action
    const emptyState = {}
    expect(app.reduce(emptyState, 'unknown', {})).toBe(emptyState)
  })

  // Add test cases for each action:
  // it('handles <action_name>', () => {
  //   const result = app.reduce({}, '<action_name>', { <params> })
  //   expect(result.<field>).toBe(<expected>)
  // })
})

// --- Summarizer ---

describe('__APP_TYPE__ summarizer', () => {
  it('handles empty state', () => {
    const summary = app.summarize({})
    expect(typeof summary).toBe('string')
    expect(summary.length).toBeGreaterThan(0)
  })

  // Add test cases for meaningful state:
  // it('summarizes state with data', () => {
  //   const summary = app.summarize({ <fields> })
  //   expect(summary).toContain('<expected>')
  // })
})

// --- Component ---

describe('__APP_TYPE__ component', () => {
  beforeEach(() => {
    useEntityStore.setState({
      entities: {},
      focusedId: null,
      _hydrating: false,
      _fromCDC: false,
    })
  })

  it('is defined and is a function', () => {
    expect(typeof app.component).toBe('function')
  })

  // Add component rendering tests as needed
})
```

---

## 7. Process (TDD, 12 steps)

Execute these steps in order. Each step that involves tests must run the suite and confirm the expected result.

```
Step 0:  Scenario check
         → Check docs/scenarios/ for a relevant scenario
         → If none exists, write a brief one (3-5 user actions) before continuing

Step 1:  Feature branch
         → git checkout -b feat/<app-type>-app

Step 2:  Create directory
         → mkdir apps/<app-type>/

Step 3:  Write types.ts
         → State shape, defaults, action schemas

Step 4:  Write tests FIRST
         → apps/__tests__/<app-type>.test.ts
         → Run: npx vitest run apps/__tests__/<app-type>.test.ts
         → ALL tests must FAIL (proves they test real behavior)

Step 5:  Write index.ts
         → reduce + summarize + app definition
         → Run tests → reducer + summarizer + definition tests PASS

Step 6:  Write root component
         → <AppName>App.tsx
         → Run tests → component tests PASS

Step 7:  Card component (if applicable)
         → <AppName>Card.tsx

Step 8:  WindowActions component (if applicable)
         → Export from index.ts as windowActions

Step 9:  Child entity hook (if applicable)
         → Follow the useCalendarEvents pattern:
           - Query entities with type filter
           - Create with presentation: 'hidden'
           - Inherit space_id and user_id from parent

Step 10: Register in apps/_registry.ts
         → Import and add to builtInApps array/object

Step 11: Update apps/__tests__/_registry.test.ts
         → Add type assertion test for new app type
         → Bump getDockApps count if it's a dock-visible app

Step 12: Full verification
         → npx vitest run
         → npx biome check .
         → Both must pass with zero errors
```

---

## 8. Common Mistakes

Check your code against every item before considering the app done.

1. **Missing `'use client'`** — Every `.tsx` file with hooks or event handlers needs it. `index.ts` does NOT.

2. **Reducer returns new object for unknown actions** — Must `return state` (the original reference), not `{ ...state }` or `{ ...defaults, ...state }`.

3. **Reducer/summarizer crashes on empty `{}` state** — Both must handle `{}` gracefully by applying defaults first.

4. **Raw color values** — No `bg-gray-100`, no `#hex`, no `rgb()`. Use semantic tokens only: `bg-surface`, `text-on-surface`, etc.

5. **Bold or italic in body text** — Not allowed. Use `text-on-surface-muted` for de-emphasis, `text-title-sm` for emphasis.

6. **Cross-app imports** — Zero imports from other `apps/` folders. If you need shared logic, it belongs in `@/lib/` or `@/core/`.

7. **Forgetting registry test update** — `_registry.test.ts` must be updated with the new app type and dock count.

8. **Creating entities without `space_id`/`user_id`** — Child entities must inherit these from the parent entity, not hardcode them.

9. **Storing ephemeral state in entity state** — UI-only state (dropdown open, input focus, hover) uses React `useState`, not entity state.

10. **Missing `data-testid` attributes** — Every interactive element and meaningful container needs one.

11. **Adding `overflow-auto` at app root** — The Window chrome already provides scrolling. Only use `overflow-auto` on inner sub-regions.

12. **Using `bg-surface-raised` on app root div** — The Window container already has this background. Your content sits on it.

---

## 9. Reference Tiers

Use these to calibrate complexity:

### Simple (settings-tier)
- 2 files: `types.ts` + `index.ts` (component inline or minimal)
- No-op or trivial reducer (1-2 actions)
- Static or near-static summarizer
- No child entities, no window actions
- Example: a settings panel, a clock display

### Medium (chat-tier)
- 3-4 files: `types.ts` + `index.ts` + `App.tsx` + optional `Card.tsx`
- Reducer with 2-4 actions
- Dynamic summarizer
- May have window actions (mode switching)
- No child entities
- Example: a timer, a notepad, a counter

### Complex (calendar-tier)
- 5+ files: types, index, App, Card, custom hook, layout utils
- Reducer with 4+ actions or complex state transitions
- Child entities with `presentation: 'hidden'`
- Custom hook for querying child entities
- Multiple sub-views or modes
- Window actions for view switching
- Example: calendar, kanban board, file manager

---

## 10. Canonical Reference

If anything in this skill seems wrong or outdated, check these files — they are the source of truth:

| Concern | Canonical Source |
|---------|-----------------|
| App contract (BuiltInApp, AppProps) | `apps/_types.ts` |
| App registry (builtInApps, getAppType) | `apps/_registry.ts` |
| Entity interface | `lib/types.ts` |
| Design tokens | `tokens/tokens.css` |
| Window chrome (scroll, padding, bg) | `core/entity/Window.tsx` |
| UI components (Button, Input, Dialog) | `core/ui/` |
| Reference app (most complete) | `apps/calendar/` |

If a canonical source file exists and contradicts this skill, the source file wins — update the skill.

---

$ARGUMENTS
