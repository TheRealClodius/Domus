# Agent Conversation Display — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display agent conversation (user messages, streamed agent text, tool call chips) in a glassmorphic panel above the prompt bar.

**Architecture:** A Zustand conversation store holds turns and streaming state. `AgentChat` calls `sendMessage()` to get an SSE stream, a consumer function reads events and dispatches to the store. `ConversationPanel` reads the store and renders turn components. Entity payloads from `tool_call_result` events are upserted into the entity store immediately.

**Tech Stack:** React 19, Zustand, motion/react, Tailwind v4 tokens, SSE (ReadableStream API)

**Scope:** Anchored mode only (glassmorphic panel above prompt bar). Pinned mode (drag-to-canvas) is deferred — flagged with TODO.

---

### Task 1: SSE Event Types

Define a discriminated union for all 5 SSE event types the agent sends.

**Files:**
- Create: `core/agent-chat/agentStreamTypes.ts`
- Test: `core/agent-chat/__tests__/agentStreamTypes.test.ts`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/agentStreamTypes.test.ts
import { describe, expect, it } from 'vitest'
import type { AgentSSEEvent } from '@/core/agent-chat/agentStreamTypes'

describe('AgentSSEEvent types', () => {
  it('narrows text_delta event', () => {
    const event: AgentSSEEvent = { type: 'text_delta', content: 'hello' }
    if (event.type === 'text_delta') {
      // TypeScript narrows — this should compile
      const text: string = event.content
      expect(text).toBe('hello')
    }
  })

  it('narrows tool_call_start event', () => {
    const event: AgentSSEEvent = { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' }
    if (event.type === 'tool_call_start') {
      expect(event.tool).toBe('create_entity')
      expect(event.id).toBe('tc-1')
    }
  })

  it('narrows tool_call_result event', () => {
    const event: AgentSSEEvent = {
      type: 'tool_call_result',
      id: 'tc-1',
      result: { id: 'entity-1', type: 'note' },
    }
    if (event.type === 'tool_call_result') {
      expect(event.result).toEqual({ id: 'entity-1', type: 'note' })
    }
  })

  it('narrows done event', () => {
    const event: AgentSSEEvent = { type: 'done' }
    if (event.type === 'done') {
      expect(event.type).toBe('done')
    }
  })

  it('narrows error event', () => {
    const event: AgentSSEEvent = { type: 'error', message: 'rate limit' }
    if (event.type === 'error') {
      expect(event.message).toBe('rate limit')
    }
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/agentStreamTypes.test.ts`
Expected: FAIL — module not found

**Step 3: Write the types**

```typescript
// core/agent-chat/agentStreamTypes.ts

export interface TextDeltaEvent {
  type: 'text_delta'
  content: string
}

export interface ToolCallStartEvent {
  type: 'tool_call_start'
  tool: string
  id: string
}

export interface ToolCallResultEvent {
  type: 'tool_call_result'
  id: string
  result: Record<string, unknown>
}

export interface DoneEvent {
  type: 'done'
}

export interface ErrorEvent {
  type: 'error'
  message: string
}

export type AgentSSEEvent =
  | TextDeltaEvent
  | ToolCallStartEvent
  | ToolCallResultEvent
  | DoneEvent
  | ErrorEvent
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/agentStreamTypes.test.ts`
Expected: PASS

**Step 5: Update parseSSEEvent return type**

In `core/agent-chat/useAgentStream.ts`, change the return type of `parseSSEEvent` from `SSEEvent | null` to `AgentSSEEvent | null`. Keep the existing `SSEEvent` interface for backwards compat until we remove it. Update the existing test to import the new type.

**Step 6: Commit**

```bash
git add core/agent-chat/agentStreamTypes.ts core/agent-chat/__tests__/agentStreamTypes.test.ts core/agent-chat/useAgentStream.ts
git commit -m "feat: typed SSE event discriminated union"
```

---

### Task 2: Conversation Store

Zustand store for conversation state shared between AgentChat (writes) and ConversationPanel (reads).

**Files:**
- Create: `core/agent-chat/conversationStore.ts`
- Test: `core/agent-chat/__tests__/conversationStore.test.ts`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/conversationStore.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import { useConversationStore } from '@/core/agent-chat/conversationStore'

describe('conversationStore', () => {
  afterEach(() => {
    useConversationStore.getState().reset()
  })

  it('starts idle with no turns', () => {
    const state = useConversationStore.getState()
    expect(state.status).toBe('idle')
    expect(state.turns).toEqual([])
    expect(state.currentTurn).toBeNull()
    expect(state.panelVisible).toBe(false)
  })

  it('addUserTurn appends a user turn and shows panel', () => {
    const { addUserTurn } = useConversationStore.getState()
    addUserTurn('Hello agent')
    const state = useConversationStore.getState()
    expect(state.turns).toHaveLength(1)
    expect(state.turns[0].role).toBe('user')
    expect(state.turns[0].text).toBe('Hello agent')
    expect(state.panelVisible).toBe(true)
  })

  it('startAgentTurn sets status to streaming and creates currentTurn', () => {
    const { startAgentTurn } = useConversationStore.getState()
    startAgentTurn()
    const state = useConversationStore.getState()
    expect(state.status).toBe('streaming')
    expect(state.currentTurn).toEqual({ role: 'agent', text: '', toolCalls: [] })
  })

  it('appendTextDelta appends to currentTurn.text', () => {
    const store = useConversationStore.getState()
    store.startAgentTurn()
    store.appendTextDelta('Hello ')
    store.appendTextDelta('world')
    expect(useConversationStore.getState().currentTurn?.text).toBe('Hello world')
  })

  it('appendTextDelta is a no-op when no currentTurn', () => {
    useConversationStore.getState().appendTextDelta('orphan')
    expect(useConversationStore.getState().currentTurn).toBeNull()
  })

  it('startToolCall adds a pending tool call', () => {
    const store = useConversationStore.getState()
    store.startAgentTurn()
    store.startToolCall('tc-1', 'create_entity')
    const calls = useConversationStore.getState().currentTurn?.toolCalls
    expect(calls).toHaveLength(1)
    expect(calls?.[0]).toEqual({ id: 'tc-1', tool: 'create_entity', status: 'pending', result: null })
  })

  it('resolveToolCall marks tool call as done with result', () => {
    const store = useConversationStore.getState()
    store.startAgentTurn()
    store.startToolCall('tc-1', 'create_entity')
    store.resolveToolCall('tc-1', { id: 'entity-1', type: 'note', summary: 'A note' })
    const call = useConversationStore.getState().currentTurn?.toolCalls[0]
    expect(call?.status).toBe('done')
    expect(call?.result).toEqual({ id: 'entity-1', type: 'note', summary: 'A note' })
  })

  it('completeTurn pushes currentTurn to turns and resets', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    store.startAgentTurn()
    store.appendTextDelta('Hello!')
    store.completeTurn('Said hello')
    const state = useConversationStore.getState()
    expect(state.turns).toHaveLength(2)
    expect(state.turns[1].role).toBe('agent')
    expect(state.turns[1].text).toBe('Hello!')
    expect(state.turns[1].summary).toBe('Said hello')
    expect(state.currentTurn).toBeNull()
    expect(state.status).toBe('idle')
  })

  it('setError sets status to error', () => {
    const store = useConversationStore.getState()
    store.startAgentTurn()
    store.setError('Something broke')
    const state = useConversationStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBe('Something broke')
  })

  it('dismissPanel hides the panel', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    expect(useConversationStore.getState().panelVisible).toBe(true)
    store.dismissPanel()
    expect(useConversationStore.getState().panelVisible).toBe(false)
  })

  it('reset clears everything', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    store.startAgentTurn()
    store.appendTextDelta('hey')
    store.reset()
    const state = useConversationStore.getState()
    expect(state.turns).toEqual([])
    expect(state.currentTurn).toBeNull()
    expect(state.status).toBe('idle')
    expect(state.panelVisible).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/conversationStore.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the store**

```typescript
// core/agent-chat/conversationStore.ts
import { create } from 'zustand'

export interface ToolCallEntry {
  id: string
  tool: string
  status: 'pending' | 'done'
  result: Record<string, unknown> | null
}

export interface ConversationTurn {
  role: 'user' | 'agent'
  text: string
  toolCalls: ToolCallEntry[]
  summary?: string
}

interface ConversationState {
  turns: ConversationTurn[]
  currentTurn: Omit<ConversationTurn, 'summary'> | null
  status: 'idle' | 'streaming' | 'error'
  error: string | null
  panelVisible: boolean

  addUserTurn: (text: string) => void
  startAgentTurn: () => void
  appendTextDelta: (content: string) => void
  startToolCall: (id: string, tool: string) => void
  resolveToolCall: (id: string, result: Record<string, unknown>) => void
  completeTurn: (summary: string) => void
  setError: (message: string) => void
  dismissPanel: () => void
  reset: () => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  turns: [],
  currentTurn: null,
  status: 'idle',
  error: null,
  panelVisible: false,

  addUserTurn: (text) => {
    set((s) => ({
      turns: [...s.turns, { role: 'user', text, toolCalls: [] }],
      panelVisible: true,
    }))
  },

  startAgentTurn: () => {
    set({ currentTurn: { role: 'agent', text: '', toolCalls: [] }, status: 'streaming', error: null })
  },

  appendTextDelta: (content) => {
    const { currentTurn } = get()
    if (!currentTurn) return
    set({ currentTurn: { ...currentTurn, text: currentTurn.text + content } })
  },

  startToolCall: (id, tool) => {
    const { currentTurn } = get()
    if (!currentTurn) return
    set({
      currentTurn: {
        ...currentTurn,
        toolCalls: [...currentTurn.toolCalls, { id, tool, status: 'pending', result: null }],
      },
    })
  },

  resolveToolCall: (id, result) => {
    const { currentTurn } = get()
    if (!currentTurn) return
    set({
      currentTurn: {
        ...currentTurn,
        toolCalls: currentTurn.toolCalls.map((tc) =>
          tc.id === id ? { ...tc, status: 'done', result } : tc,
        ),
      },
    })
  },

  completeTurn: (summary) => {
    const { currentTurn } = get()
    if (!currentTurn) return
    const completedTurn: ConversationTurn = { ...currentTurn, summary }
    set((s) => ({
      turns: [...s.turns, completedTurn],
      currentTurn: null,
      status: 'idle',
    }))
  },

  setError: (message) => {
    set({ status: 'error', error: message })
  },

  dismissPanel: () => {
    set({ panelVisible: false })
  },

  reset: () => {
    set({ turns: [], currentTurn: null, status: 'idle', error: null, panelVisible: false })
  },
}))
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/conversationStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/conversationStore.ts core/agent-chat/__tests__/conversationStore.test.ts
git commit -m "feat: conversation Zustand store"
```

---

### Task 3: SSE Stream Consumer

A function that reads an SSE `ReadableStream`, parses events, and dispatches to the conversation store + entity store.

**Files:**
- Create: `core/agent-chat/consumeAgentStream.ts`
- Test: `core/agent-chat/__tests__/consumeAgentStream.test.ts`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/consumeAgentStream.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { consumeAgentStream } from '@/core/agent-chat/consumeAgentStream'
import { useConversationStore } from '@/core/agent-chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

function makeStream(lines: string[]): ReadableStream<Uint8Array> {
  const text = lines.map((l) => `data: ${JSON.stringify(l)}\n\n`).join('')
  // We actually need raw SSE format, not double-encoded
  return new ReadableStream({
    start(controller) {
      // Send raw SSE lines
      const raw = lines.map((l) => l + '\n\n').join('')
      controller.enqueue(new TextEncoder().encode(raw))
      controller.close()
    },
  })
}

function sseStream(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(raw))
      controller.close()
    },
  })
}

describe('consumeAgentStream', () => {
  afterEach(() => {
    useConversationStore.getState().reset()
    // Reset entity store
    useEntityStore.setState({ entities: {} })
  })

  it('processes text_delta events into conversation store', async () => {
    const stream = sseStream([
      { type: 'text_delta', content: 'Hello ' },
      { type: 'text_delta', content: 'world' },
      { type: 'done' },
    ])

    await consumeAgentStream(stream)

    const state = useConversationStore.getState()
    expect(state.turns).toHaveLength(1)
    expect(state.turns[0].text).toBe('Hello world')
    expect(state.status).toBe('idle')
  })

  it('processes tool_call_start and tool_call_result events', async () => {
    const stream = sseStream([
      { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
      { type: 'tool_call_result', id: 'tc-1', result: { id: 'e-1', type: 'note', summary: 'A note' } },
      { type: 'done' },
    ])

    await consumeAgentStream(stream)

    const state = useConversationStore.getState()
    const turn = state.turns[0]
    expect(turn.toolCalls).toHaveLength(1)
    expect(turn.toolCalls[0].status).toBe('done')
    expect(turn.toolCalls[0].result).toEqual({ id: 'e-1', type: 'note', summary: 'A note' })
  })

  it('upserts entity from tool_call_result with entity-shaped result', async () => {
    const entityPayload = {
      id: 'e-1',
      space_id: 'sp-1',
      user_id: 'u-1',
      type: 'note',
      presentation: 'card',
      position: { x: 50, y: 50, locked: false },
      size: { width: 236, height: 302 },
      z_index: 1,
      content: 'hello',
      state: {},
      summary: 'A note',
      created_by: 'agent',
      archived: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    const stream = sseStream([
      { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
      { type: 'tool_call_result', id: 'tc-1', result: entityPayload },
      { type: 'done' },
    ])

    await consumeAgentStream(stream)

    const entity = useEntityStore.getState().entities['e-1']
    expect(entity).toBeDefined()
    expect(entity.type).toBe('note')
    expect(entity.presentation).toBe('card')
  })

  it('sets error status on error event', async () => {
    const stream = sseStream([
      { type: 'text_delta', content: 'partial' },
      { type: 'error', message: 'rate limit exceeded' },
    ])

    await consumeAgentStream(stream)

    const state = useConversationStore.getState()
    expect(state.status).toBe('error')
    expect(state.error).toBe('rate limit exceeded')
  })

  it('handles multiple tool calls in a single turn', async () => {
    const stream = sseStream([
      { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
      { type: 'tool_call_result', id: 'tc-1', result: { id: 'e-1' } },
      { type: 'tool_call_start', tool: 'query_entities', id: 'tc-2' },
      { type: 'tool_call_result', id: 'tc-2', result: { items: [] } },
      { type: 'text_delta', content: 'Done!' },
      { type: 'done' },
    ])

    await consumeAgentStream(stream)

    const turn = useConversationStore.getState().turns[0]
    expect(turn.toolCalls).toHaveLength(2)
    expect(turn.text).toBe('Done!')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/consumeAgentStream.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the consumer**

```typescript
// core/agent-chat/consumeAgentStream.ts
import type { AgentSSEEvent } from '@/core/agent-chat/agentStreamTypes'
import { useConversationStore } from '@/core/agent-chat/conversationStore'
import { parseSSEEvent } from '@/core/agent-chat/useAgentStream'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

/** Heuristic: does this result look like an Entity we should upsert? */
function isEntityPayload(result: Record<string, unknown>): result is Entity {
  return (
    typeof result.id === 'string' &&
    typeof result.type === 'string' &&
    typeof result.presentation === 'string'
  )
}

/**
 * Generate a summary from an agent turn's content.
 * Uses the first sentence of text, or describes tool calls if no text.
 */
function deriveSummary(text: string, toolCalls: { tool: string; result: Record<string, unknown> | null }[]): string {
  if (text.trim()) {
    const firstSentence = text.trim().split(/[.!?\n]/)[0]
    return firstSentence.length > 80 ? firstSentence.slice(0, 77) + '...' : firstSentence
  }
  if (toolCalls.length > 0) {
    const names = toolCalls.map((tc) => tc.tool.replace(/_/g, ' ')).join(', ')
    return `Used ${names}`
  }
  return 'Agent responded'
}

/**
 * Read an SSE stream from the agent, dispatch events to conversation + entity stores.
 * Resolves when the stream ends (done/error/close).
 */
export async function consumeAgentStream(stream: ReadableStream<Uint8Array>): Promise<void> {
  const store = useConversationStore.getState()
  store.startAgentTurn()

  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const event = parseSSEEvent(trimmed) as AgentSSEEvent | null
        if (!event) continue

        const s = useConversationStore.getState()

        switch (event.type) {
          case 'text_delta':
            s.appendTextDelta(event.content)
            break

          case 'tool_call_start':
            s.startToolCall(event.id, event.tool)
            break

          case 'tool_call_result': {
            const result = event.result as Record<string, unknown>
            s.resolveToolCall(event.id, result)
            if (isEntityPayload(result)) {
              useEntityStore.getState().upsert(result as Entity)
            }
            break
          }

          case 'done': {
            const current = useConversationStore.getState().currentTurn
            const summary = current
              ? deriveSummary(current.text, current.toolCalls)
              : 'Agent responded'
            useConversationStore.getState().completeTurn(summary)
            return
          }

          case 'error':
            s.setError(event.message)
            return
        }
      }
    }

    // Stream ended without a done event — complete anyway
    const current = useConversationStore.getState().currentTurn
    if (current) {
      const summary = deriveSummary(current.text, current.toolCalls)
      useConversationStore.getState().completeTurn(summary)
    }
  } finally {
    reader.releaseLock()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/consumeAgentStream.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/consumeAgentStream.ts core/agent-chat/__tests__/consumeAgentStream.test.ts
git commit -m "feat: SSE stream consumer dispatching to stores"
```

---

### Task 4: UserBubble Component

Compact right-aligned bubble for user messages.

**Files:**
- Create: `core/agent-chat/UserBubble.tsx`
- Test: `core/agent-chat/__tests__/UserBubble.test.tsx`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/UserBubble.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UserBubble from '@/core/agent-chat/UserBubble'

describe('UserBubble', () => {
  afterEach(cleanup)

  it('renders user message text', () => {
    render(<UserBubble text="Make me a grocery list" />)
    expect(screen.getByText('Make me a grocery list')).toBeDefined()
  })

  it('is right-aligned', () => {
    const { container } = render(<UserBubble text="hello" />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('justify-end')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/UserBubble.test.tsx`
Expected: FAIL

**Step 3: Implement**

```tsx
// core/agent-chat/UserBubble.tsx
export default function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-surface-raised px-3 py-2 text-body text-on-surface-muted">
        {text}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/UserBubble.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/UserBubble.tsx core/agent-chat/__tests__/UserBubble.test.tsx
git commit -m "feat: UserBubble component"
```

---

### Task 5: ActionChip Component

Inline pill for tool calls — spinning when pending, checkmark when resolved. Tappable when resolved.

**Files:**
- Create: `core/agent-chat/ActionChip.tsx`
- Test: `core/agent-chat/__tests__/ActionChip.test.tsx`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/ActionChip.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActionChip from '@/core/agent-chat/ActionChip'

describe('ActionChip', () => {
  afterEach(cleanup)

  it('shows spinner and tool label when pending', () => {
    render(<ActionChip tool="create_entity" status="pending" />)
    expect(screen.getByText(/creating entity/i)).toBeDefined()
    expect(screen.getByTestId('action-chip-spinner')).toBeDefined()
  })

  it('shows checkmark and result label when done', () => {
    render(
      <ActionChip
        tool="create_entity"
        status="done"
        result={{ id: 'e-1', summary: 'Grocery list' }}
      />,
    )
    expect(screen.getByText(/created "Grocery list"/i)).toBeDefined()
    expect(screen.getByTestId('action-chip-check')).toBeDefined()
  })

  it('calls onFocusEntity when clicked and done', () => {
    const onFocus = vi.fn()
    render(
      <ActionChip
        tool="create_entity"
        status="done"
        result={{ id: 'e-1', summary: 'Note' }}
        onFocusEntity={onFocus}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onFocus).toHaveBeenCalledWith('e-1')
  })

  it('is not clickable when pending', () => {
    render(<ActionChip tool="create_entity" status="pending" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/ActionChip.test.tsx`
Expected: FAIL

**Step 3: Implement**

```tsx
// core/agent-chat/ActionChip.tsx
import { Check, Loader2 } from 'lucide-react'

const TOOL_LABELS: Record<string, { pending: string; done: string }> = {
  create_entity: { pending: 'Creating entity', done: 'Created' },
  update_entity: { pending: 'Updating entity', done: 'Updated' },
  query_entities: { pending: 'Searching', done: 'Found results' },
  read_entity: { pending: 'Reading entity', done: 'Read' },
  web_search: { pending: 'Searching the web', done: 'Found results' },
}

function getLabel(tool: string, status: 'pending' | 'done', result?: Record<string, unknown> | null) {
  const labels = TOOL_LABELS[tool] ?? { pending: `Running ${tool.replace(/_/g, ' ')}`, done: tool.replace(/_/g, ' ') }
  if (status === 'pending') return `${labels.pending}...`
  const summary = result?.summary as string | undefined
  if (summary) return `${labels.done} "${summary}"`
  return labels.done
}

interface ActionChipProps {
  tool: string
  status: 'pending' | 'done'
  result?: Record<string, unknown> | null
  onFocusEntity?: (entityId: string) => void
}

export default function ActionChip({ tool, status, result, onFocusEntity }: ActionChipProps) {
  const label = getLabel(tool, status, result)
  const entityId = result?.id as string | undefined
  const canClick = status === 'done' && entityId && onFocusEntity

  const content = (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-sunken px-2.5 py-1 text-label text-on-surface-muted">
      {status === 'pending' ? (
        <Loader2 data-testid="action-chip-spinner" size={14} className="animate-spin" />
      ) : (
        <Check data-testid="action-chip-check" size={14} className="text-agent" />
      )}
      <span>{label}</span>
    </div>
  )

  if (canClick) {
    return (
      <button type="button" onClick={() => onFocusEntity(entityId)} className="text-left">
        {content}
      </button>
    )
  }

  return content
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/ActionChip.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/ActionChip.tsx core/agent-chat/__tests__/ActionChip.test.tsx
git commit -m "feat: ActionChip component for tool call display"
```

---

### Task 6: AgentTurn Component

Renders a completed agent turn — collapsed (summary line) or expanded (full text + action chips). Toggles on click.

**Files:**
- Create: `core/agent-chat/AgentTurn.tsx`
- Test: `core/agent-chat/__tests__/AgentTurn.test.tsx`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/AgentTurn.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AgentTurn from '@/core/agent-chat/AgentTurn'
import type { ConversationTurn } from '@/core/agent-chat/conversationStore'

const turn: ConversationTurn = {
  role: 'agent',
  text: 'Here is your grocery list with all the items you asked for.',
  toolCalls: [{ id: 'tc-1', tool: 'create_entity', status: 'done', result: { id: 'e-1', summary: 'Grocery list' } }],
  summary: 'Created a grocery list note',
}

describe('AgentTurn', () => {
  afterEach(cleanup)

  it('renders collapsed summary by default', () => {
    render(<AgentTurn turn={turn} />)
    expect(screen.getByText('Created a grocery list note')).toBeDefined()
    // Full text should not be visible when collapsed
    expect(screen.queryByText(/Here is your grocery list/)).toBeNull()
  })

  it('expands to show full text and chips on click', () => {
    render(<AgentTurn turn={turn} />)
    fireEvent.click(screen.getByText('Created a grocery list note'))
    expect(screen.getByText(/Here is your grocery list/)).toBeDefined()
    expect(screen.getByText(/Created "Grocery list"/i)).toBeDefined()
  })

  it('collapses again on second click', () => {
    render(<AgentTurn turn={turn} />)
    const summary = screen.getByText('Created a grocery list note')
    fireEvent.click(summary)
    expect(screen.getByText(/Here is your grocery list/)).toBeDefined()
    fireEvent.click(summary)
    expect(screen.queryByText(/Here is your grocery list/)).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/AgentTurn.test.tsx`
Expected: FAIL

**Step 3: Implement**

```tsx
// core/agent-chat/AgentTurn.tsx
'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import ActionChip from '@/core/agent-chat/ActionChip'
import type { ConversationTurn } from '@/core/agent-chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

export default function AgentTurn({ turn }: { turn: ConversationTurn }) {
  const [expanded, setExpanded] = useState(false)
  const setFocused = useEntityStore((s) => s.setFocused)

  return (
    <div className="flex flex-col gap-1">
      {/* Collapsed summary — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body text-on-surface transition-colors hover:bg-surface-sunken"
      >
        <ChevronDown
          size={14}
          className="shrink-0 text-on-surface-muted transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
        <span className="text-on-surface-muted">{turn.summary ?? 'Agent responded'}</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="flex flex-col gap-2 pl-6">
          {turn.text && (
            <p className="text-body text-on-surface whitespace-pre-wrap">{turn.text}</p>
          )}
          {turn.toolCalls.map((tc) => (
            <ActionChip
              key={tc.id}
              tool={tc.tool}
              status={tc.status}
              result={tc.result}
              onFocusEntity={(id) => setFocused(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/AgentTurn.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/AgentTurn.tsx core/agent-chat/__tests__/AgentTurn.test.tsx
git commit -m "feat: AgentTurn component with collapse/expand"
```

---

### Task 7: ActiveTurn Component

Renders the in-progress agent turn — streaming text and pending tool call chips.

**Files:**
- Create: `core/agent-chat/ActiveTurn.tsx`
- Test: `core/agent-chat/__tests__/ActiveTurn.test.tsx`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/ActiveTurn.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ActiveTurn from '@/core/agent-chat/ActiveTurn'

describe('ActiveTurn', () => {
  afterEach(cleanup)

  it('renders streaming text', () => {
    render(
      <ActiveTurn
        text="Here is your grocery"
        toolCalls={[]}
      />,
    )
    expect(screen.getByText('Here is your grocery')).toBeDefined()
  })

  it('renders pending tool call chip', () => {
    render(
      <ActiveTurn
        text=""
        toolCalls={[{ id: 'tc-1', tool: 'create_entity', status: 'pending', result: null }]}
      />,
    )
    expect(screen.getByText(/creating entity/i)).toBeDefined()
  })

  it('renders resolved tool call chip alongside text', () => {
    render(
      <ActiveTurn
        text="Here it is"
        toolCalls={[
          { id: 'tc-1', tool: 'create_entity', status: 'done', result: { id: 'e-1', summary: 'Note' } },
        ]}
      />,
    )
    expect(screen.getByText('Here it is')).toBeDefined()
    expect(screen.getByText(/Created "Note"/i)).toBeDefined()
  })

  it('renders nothing when text is empty and no tool calls', () => {
    const { container } = render(<ActiveTurn text="" toolCalls={[]} />)
    expect(container.textContent).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/ActiveTurn.test.tsx`
Expected: FAIL

**Step 3: Implement**

```tsx
// core/agent-chat/ActiveTurn.tsx
import ActionChip from '@/core/agent-chat/ActionChip'
import type { ToolCallEntry } from '@/core/agent-chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

interface ActiveTurnProps {
  text: string
  toolCalls: ToolCallEntry[]
}

export default function ActiveTurn({ text, toolCalls }: ActiveTurnProps) {
  const setFocused = useEntityStore((s) => s.setFocused)

  if (!text && toolCalls.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {toolCalls.map((tc) => (
        <ActionChip
          key={tc.id}
          tool={tc.tool}
          status={tc.status}
          result={tc.result}
          onFocusEntity={(id) => setFocused(id)}
        />
      ))}
      {text && (
        <p className="text-body text-on-surface whitespace-pre-wrap">{text}</p>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/ActiveTurn.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/ActiveTurn.tsx core/agent-chat/__tests__/ActiveTurn.test.tsx
git commit -m "feat: ActiveTurn component for streaming display"
```

---

### Task 8: ConversationPanel

The glassmorphic container that appears above the prompt bar. Reads from conversation store and renders UserBubbles, AgentTurns, and ActiveTurn.

**Files:**
- Create: `core/agent-chat/ConversationPanel.tsx`
- Test: `core/agent-chat/__tests__/ConversationPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// core/agent-chat/__tests__/ConversationPanel.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ConversationPanel from '@/core/agent-chat/ConversationPanel'
import { useConversationStore } from '@/core/agent-chat/conversationStore'

describe('ConversationPanel', () => {
  afterEach(() => {
    cleanup()
    useConversationStore.getState().reset()
  })

  it('renders nothing when panelVisible is false', () => {
    const { container } = render(<ConversationPanel />)
    expect(container.querySelector('[data-testid="conversation-panel"]')).toBeNull()
  })

  it('renders panel when panelVisible is true', () => {
    useConversationStore.getState().addUserTurn('hello')
    render(<ConversationPanel />)
    expect(screen.getByTestId('conversation-panel')).toBeDefined()
  })

  it('renders user messages', () => {
    useConversationStore.getState().addUserTurn('Make me a note')
    render(<ConversationPanel />)
    expect(screen.getByText('Make me a note')).toBeDefined()
  })

  it('renders completed agent turns as summaries', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    store.startAgentTurn()
    store.appendTextDelta('Hello there!')
    store.completeTurn('Said hello')
    render(<ConversationPanel />)
    expect(screen.getByText('Said hello')).toBeDefined()
  })

  it('renders active turn with streaming text', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    store.startAgentTurn()
    store.appendTextDelta('I am streaming...')
    render(<ConversationPanel />)
    expect(screen.getByText('I am streaming...')).toBeDefined()
  })

  it('renders error state inline', () => {
    const store = useConversationStore.getState()
    store.addUserTurn('hi')
    store.startAgentTurn()
    store.setError('Rate limit exceeded')
    render(<ConversationPanel />)
    expect(screen.getByText(/rate limit exceeded/i)).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/ConversationPanel.test.tsx`
Expected: FAIL

**Step 3: Implement**

```tsx
// core/agent-chat/ConversationPanel.tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import ActiveTurn from '@/core/agent-chat/ActiveTurn'
import AgentTurn from '@/core/agent-chat/AgentTurn'
import UserBubble from '@/core/agent-chat/UserBubble'
import { useConversationStore } from '@/core/agent-chat/conversationStore'
import { SPRING } from '@/lib/motion'

export default function ConversationPanel() {
  const turns = useConversationStore((s) => s.turns)
  const currentTurn = useConversationStore((s) => s.currentTurn)
  const status = useConversationStore((s) => s.status)
  const error = useConversationStore((s) => s.error)
  const panelVisible = useConversationStore((s) => s.panelVisible)

  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (userScrolledUp.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns.length, currentTurn?.text, currentTurn?.toolCalls.length])

  // Detect user scrolling up
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32
      userScrolledUp.current = !atBottom
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AnimatePresence>
      {panelVisible && (
        <motion.div
          data-testid="conversation-panel"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={SPRING.gentle}
          className="w-[400px] overflow-hidden rounded-2xl border border-outline/25"
          style={{
            maxHeight: '60vh',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            background: 'var(--surface-glass-heavy)',
          }}
        >
          {/* TODO: Drag handle for pin-to-canvas (deferred) */}

          <div
            ref={scrollRef}
            className="flex flex-col gap-3 overflow-y-auto p-4"
            style={{ maxHeight: '60vh' }}
          >
            {turns.map((turn, i) =>
              turn.role === 'user' ? (
                <UserBubble key={`turn-${i}`} text={turn.text} />
              ) : (
                <AgentTurn key={`turn-${i}`} turn={turn} />
              ),
            )}

            {currentTurn && (
              <ActiveTurn text={currentTurn.text} toolCalls={currentTurn.toolCalls} />
            )}

            {status === 'error' && error && (
              <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-body text-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/ConversationPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/ConversationPanel.tsx core/agent-chat/__tests__/ConversationPanel.test.tsx
git commit -m "feat: ConversationPanel with glassmorphic container"
```

---

### Task 9: Wire AgentChat to Send Messages

Connect `AgentChat.handleSend` to the conversation store and SSE consumer. Add the `ConversationPanel` above the prompt bar.

**Files:**
- Modify: `core/agent-chat/AgentChat.tsx`
- Test: `core/agent-chat/__tests__/AgentChat.test.tsx` (update existing tests, add new ones)

**Step 1: Update the existing tests and add new ones**

The existing tests (textarea renders, Enter clears input, etc.) should still pass. Add tests for:

```typescript
// Add to core/agent-chat/__tests__/AgentChat.test.tsx
import { useConversationStore } from '@/core/agent-chat/conversationStore'

// Add afterEach:
afterEach(() => {
  useConversationStore.getState().reset()
})

it('adds a user turn to conversation store on send', () => {
  render(<AgentChat spaceId="space-1" userId="user-1" />)
  const textarea = screen.getByPlaceholderText('Message...')
  fireEvent.change(textarea, { target: { value: 'Hello agent' } })
  fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
  const turns = useConversationStore.getState().turns
  expect(turns).toHaveLength(1)
  expect(turns[0].role).toBe('user')
  expect(turns[0].text).toBe('Hello agent')
})

it('renders ConversationPanel above prompt input', () => {
  useConversationStore.getState().addUserTurn('test')
  render(<AgentChat spaceId="space-1" userId="user-1" />)
  expect(screen.getByTestId('conversation-panel')).toBeDefined()
})
```

**Step 2: Run tests to verify new ones fail**

Run: `npx vitest run core/agent-chat/__tests__/AgentChat.test.tsx`
Expected: New tests FAIL (existing tests still pass)

**Step 3: Update AgentChat**

```tsx
// core/agent-chat/AgentChat.tsx
'use client'

import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'

import ConversationPanel from '@/core/agent-chat/ConversationPanel'
import PromptInput from '@/core/agent-chat/PromptInput'
import PromptInputMenu from '@/core/agent-chat/PromptInputMenu'
import { consumeAgentStream } from '@/core/agent-chat/consumeAgentStream'
import { useConversationStore } from '@/core/agent-chat/conversationStore'
import { sendMessage } from '@/core/agent-chat/useAgentStream'
import { usePromptInputState } from '@/core/agent-chat/usePromptInputState'

export default function AgentChat({
  spaceId,
  userId,
}: {
  spaceId: string
  userId: string
}) {
  const state = usePromptInputState()
  const [menuOpen, setMenuOpen] = useState(false)
  const status = useConversationStore((s) => s.status)

  const handleSend = useCallback(async () => {
    if (!state.canSend) return
    const text = state.text.trim()
    state.reset()

    useConversationStore.getState().addUserTurn(text)

    try {
      const stream = await sendMessage({ spaceId, userId, message: text })
      await consumeAgentStream(stream)
    } catch (err) {
      useConversationStore.getState().setError(
        err instanceof Error ? err.message : 'Failed to send message',
      )
    }
  }, [state, spaceId, userId])

  const handleMenuClose = useCallback(() => setMenuOpen(false), [])

  return (
    <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      <ConversationPanel />
      <AnimatePresence>
        {menuOpen && (
          <PromptInputMenu
            onClose={handleMenuClose}
            onAddItem={state.addContextItem}
            onUpdateItem={state.updateContextItem}
          />
        )}
      </AnimatePresence>
      <PromptInput
        text={state.text}
        onTextChange={state.setText}
        onSend={handleSend}
        contextItems={state.contextItems}
        onAddContextItem={state.addContextItem}
        onUpdateContextItem={state.updateContextItem}
        onRemoveContextItem={state.removeContextItem}
        isGenerating={status === 'streaming'}
        onStop={() => {
          // TODO: abort controller to cancel SSE stream
        }}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />
    </div>
  )
}
```

**Step 4: Run tests to verify all pass**

Run: `npx vitest run core/agent-chat/__tests__/AgentChat.test.tsx`
Expected: ALL PASS

Note: The `sendMessage` call will fail in tests since there's no server. The existing tests that use Enter to send won't try to fetch because the mock won't resolve. If tests fail on the fetch, mock `sendMessage`:

```typescript
vi.mock('@/core/agent-chat/useAgentStream', () => ({
  sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
  parseSSEEvent: vi.fn(),
}))
```

**Step 5: Commit**

```bash
git add core/agent-chat/AgentChat.tsx core/agent-chat/__tests__/AgentChat.test.tsx
git commit -m "feat: wire AgentChat to conversation store and SSE consumer"
```

---

### Task 10: Escape to Dismiss + Keyboard

Escape key while the panel is anchored retracts it. Focus stays in the prompt input during streaming.

**Files:**
- Modify: `core/agent-chat/ConversationPanel.tsx`
- Modify: `core/agent-chat/__tests__/ConversationPanel.test.tsx`

**Step 1: Add test**

```typescript
// Add to ConversationPanel.test.tsx
it('dismisses panel on Escape key', () => {
  useConversationStore.getState().addUserTurn('hi')
  render(<ConversationPanel />)
  expect(screen.getByTestId('conversation-panel')).toBeDefined()
  fireEvent.keyDown(document, { key: 'Escape' })
  // AnimatePresence exit — panel should trigger dismiss
  expect(useConversationStore.getState().panelVisible).toBe(false)
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/agent-chat/__tests__/ConversationPanel.test.tsx`
Expected: New test FAIL

**Step 3: Add Escape handler to ConversationPanel**

Add a `useEffect` that listens for Escape:

```typescript
const dismissPanel = useConversationStore((s) => s.dismissPanel)

useEffect(() => {
  if (!panelVisible) return
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dismissPanel()
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [panelVisible, dismissPanel])
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/agent-chat/__tests__/ConversationPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add core/agent-chat/ConversationPanel.tsx core/agent-chat/__tests__/ConversationPanel.test.tsx
git commit -m "feat: Escape key dismisses conversation panel"
```

---

### Task 11: Full Integration Smoke Test

End-to-end test verifying the complete flow: send message → SSE stream → conversation panel renders turns.

**Files:**
- Create: `core/agent-chat/__tests__/agentChatIntegration.test.tsx`

**Step 1: Write the test**

```typescript
// core/agent-chat/__tests__/agentChatIntegration.test.tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AgentChat from '@/core/agent-chat/AgentChat'
import { useConversationStore } from '@/core/agent-chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

function sseStream(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
  const raw = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(raw))
      controller.close()
    },
  })
}

vi.mock('@/core/agent-chat/useAgentStream', async () => {
  const actual = await vi.importActual('@/core/agent-chat/useAgentStream')
  return {
    ...actual,
    sendMessage: vi.fn().mockResolvedValue(
      sseStream([
        { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
        {
          type: 'tool_call_result',
          id: 'tc-1',
          result: {
            id: 'e-1',
            space_id: 'sp-1',
            user_id: 'u-1',
            type: 'note',
            presentation: 'card',
            position: { x: 50, y: 50, locked: false },
            size: { width: 236, height: 302 },
            z_index: 1,
            content: 'Grocery list',
            state: {},
            summary: 'Grocery list',
            created_by: 'agent',
            archived: false,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
        { type: 'text_delta', content: 'Created your grocery list!' },
        { type: 'done' },
      ]),
    ),
  }
})

describe('AgentChat integration', () => {
  afterEach(() => {
    cleanup()
    useConversationStore.getState().reset()
    useEntityStore.setState({ entities: {} })
  })

  it('full flow: send message, stream response, display turn, upsert entity', async () => {
    render(<AgentChat spaceId="space-1" userId="user-1" />)

    const textarea = screen.getByPlaceholderText('Message...')
    fireEvent.change(textarea, { target: { value: 'Make me a grocery list' } })
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

    // Wait for the SSE stream to be consumed
    await waitFor(() => {
      const state = useConversationStore.getState()
      return expect(state.turns.length).toBeGreaterThanOrEqual(2) // user + agent
    })

    // User message appears in panel
    expect(screen.getByText('Make me a grocery list')).toBeDefined()

    // Agent turn summary appears (collapsed)
    const state = useConversationStore.getState()
    expect(state.turns[1].role).toBe('agent')
    expect(state.turns[1].text).toBe('Created your grocery list!')
    expect(state.turns[1].toolCalls).toHaveLength(1)

    // Entity was upserted to the entity store
    const entity = useEntityStore.getState().entities['e-1']
    expect(entity).toBeDefined()
    expect(entity.type).toBe('note')
  })
})
```

**Step 2: Run test**

Run: `npx vitest run core/agent-chat/__tests__/agentChatIntegration.test.tsx`
Expected: PASS (if everything from previous tasks is correct)

If it fails, debug and fix. This is the integration checkpoint.

**Step 3: Commit**

```bash
git add core/agent-chat/__tests__/agentChatIntegration.test.tsx
git commit -m "test: full integration test for agent conversation flow"
```

---

### Deferred (TODO markers in code)

These are explicitly deferred and should have TODO comments:

1. **Pinned mode** — drag ConversationPanel to detach from prompt bar and create a canvas entity. TODO in ConversationPanel.tsx.
2. **Abort controller** — cancel SSE stream when user clicks Stop. TODO in AgentChat.tsx.
3. **Auto-collapse during streaming** — collapse text sections when tool calls start (and vice versa). Current implementation shows everything; auto-collapse is a polish item.
4. **Cross-session persistence** — fetch recent conversation turns on page load. Currently conversations start fresh each session.
