# Agent Conversation Display — Design

## Problem

The agent service (Domus-Agent, deployed separately on Railway) streams SSE events to the frontend. We need to display the conversation — user messages, agent text, and tool call activity — in a way that doesn't block the canvas and treats conversations as persistent, referenceable artifacts.

## SSE Interface (from agent service)

Five event types arrive via SSE:

| Event | Payload | Purpose |
|-------|---------|---------|
| `text_delta` | `{ type, content }` | Agent's text response (currently full blocks, not per-token) |
| `tool_call_start` | `{ type, tool, id }` | Agent invoking a tool |
| `tool_call_result` | `{ type, id, result }` | Tool result (includes full entity payload for create/update) |
| `done` | `{ type }` | Turn complete |
| `error` | `{ type, message }` | Error occurred |

## Design

### Panel modes

| Mode | Trigger | Visual | Dismiss |
|------|---------|--------|---------|
| **Anchored** | Send a message | Glassmorphic, extends up from prompt bar | Slides back into prompt bar |
| **Pinned** | Drag panel away from prompt | Solid window (bg-surface-raised, shadow, window chrome) | Close button (sets hidden) |

Transition from anchored to pinned: blur fades out, solid background fades in, window chrome appears. Spring animation.

### Lifecycle states

1. **Idle** — Panel hidden/retracted. Only prompt input visible.
2. **Streaming** — Agent responding. Panel open, showing live feed.
3. **Resting** — Agent done. Turns collapsed to summary lines.

### Rendering during streaming

- **`text_delta`** — Text appears in agent message area. Cursor animation if per-token streaming is enabled later.
- **`tool_call_start`** — Inline action chip: `[spinner] Creating note...` Compact pill, muted colors.
- **`tool_call_result`** — Chip resolves: `[checkmark] Created "Grocery list"` Tappable — focuses the created entity on canvas.
- **Auto-collapse** — When a text section finishes and a tool call starts (or vice versa), the previous section collapses to a summary line. Keeps the active area compact. Tap to expand.

### Rendering after streaming (resting state)

Each completed turn collapses to a one-line summary. Tap to expand and see full text + action chips.

### User messages

Compact right-aligned bubbles. Muted styling (text-muted, smaller font, bg-surface-raised). Agent responses are the visual focus.

### Scroll behavior

Auto-scroll to bottom during streaming. Pauses if user scrolls up. Resumes when user scrolls back to bottom.

## Data flow

```
User types -> PromptInput -> useAgentStream.sendMessage()
                                    |
                          POST /api/agent (Next.js proxy)
                                    |
                          Railway agent service
                                    | SSE
                          useAgentStream receives events
                                    |
                     +--------------+----------------+
                     |                               |
              ConversationPanel              Entity store
              (renders text/chips)      (upserts from tool_call_result)
```

`useAgentStream` is the single source of truth during streaming:
- `turns[]` — accumulated conversation turns (user + agent)
- `currentTurn` — in-progress agent response (text chunks + pending tool calls)
- `status` — idle | streaming | error

On `done`: current turn pushed to `turns[]`, `currentTurn` resets.
On `tool_call_result` with entity payload: also calls `entityStore.upsert()`.

## Component tree

```
<CanvasShell>
  <SpaceRenderer>
    {entities}
  </SpaceRenderer>

  <ConversationPanel>                 // The panel
    <TurnList>                        // Scrollable turn history
      <UserBubble />                  // User message (compact, right-aligned)
      <AgentTurn collapsed>           // Completed turn (summary line)
        <AgentText />                 // Expandable full text
        <ActionChip />                // Resolved tool call chips
      </AgentTurn>
    </TurnList>
    <ActiveTurn>                      // In-progress agent response
      <StreamingText />               // Live text from text_delta
      <PendingChip />                 // Spinning tool_call_start chip
    </ActiveTurn>
  </ConversationPanel>

  <AgentChat>                         // Existing: prompt input area
    <PromptInput />
  </AgentChat>
</CanvasShell>
```

## Anchored vs Pinned rendering

Both modes share the same inner components (TurnList, AgentTurn, UserBubble, etc.). Only the outer shell differs:

- **Anchored**: CSS-positioned (fixed, bottom-aligned above prompt bar). Not in entity store. Glassmorphic styles. Fixed width matching prompt bar (~400px), max height ~60% viewport.
- **Pinned**: Creates a conversation entity in the store. Unmounts from CSS position, remounts as a `<Window>` on canvas with solid styles. Resizable, default ~400x500px.

## Edge cases

- **Error**: Inline error message in active turn area. Prompt stays active for retry. (P12: no toasts)
- **Rapid messages**: New message while streaming — current turn completes, new exchange appears below.
- **Empty state**: Panel invisible until first agent response streams in.
- **Keyboard**: Escape while anchored = retract. Focus stays in prompt input during streaming.
- **Cross-session**: Conversations start fresh each session. Fetching persisted turns from agent service is a later concern.
