# Chat App Design

## Overview

Global cross-space user-to-user chat. Authenticated users can create groups, invite members, and exchange real-time messages with media. The chat app renders inside a Window entity; message data lives in dedicated Supabase tables outside the entity system.

## Decisions

- **Scope:** Global (cross-space), tied to user accounts not spaces
- **Real-time:** Supabase Realtime Broadcast channels per group
- **DMs:** No separate concept — a DM is a 2-person group
- **Auth:** Required. Unauthenticated users see a sign-in prompt
- **MVP features:** Text messages, groups, typing indicators, image/file media
- **Agent access:** Chat window is an entity (agent sees app state). Messages in dedicated tables, accessible via future agent tool

## Data Model

### `chat_groups`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | Group display name |
| `avatar_url` | text? | Optional group image |
| `invite_code` | text unique | Short code for invite links |
| `created_by` | uuid FK → auth.users | Group creator |
| `created_at` | timestamptz | |

### `chat_members`

| Column | Type | Notes |
|--------|------|-------|
| `group_id` | uuid FK → chat_groups | |
| `user_id` | uuid FK → auth.users | |
| `role` | text | `'owner'` / `'member'` |
| `joined_at` | timestamptz | |
| `last_read_at` | timestamptz | For unread count calculation |
| PK | `(group_id, user_id)` | Composite primary key |

### `chat_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `group_id` | uuid FK → chat_groups | |
| `user_id` | uuid FK → auth.users | Sender |
| `content` | text | Message text (markdown) |
| `media_url` | text? | Optional attachment URL |
| `media_type` | text? | MIME type when media present |
| `created_at` | timestamptz | |

### RLS

- `chat_messages`: SELECT/INSERT only if user is a member of the group
- `chat_groups`: SELECT only if user is a member (via `chat_members`)
- `chat_members`: SELECT own memberships; INSERT if group owner or via invite code

## Real-time Architecture

Channel per group: `chat:{group_id}`

| Event | Payload | Persisted |
|-------|---------|-----------|
| `message` | `{ id, user_id, content, media_url, media_type, created_at }` | Yes (DB insert) |
| `typing` | `{ user_id }` | No (ephemeral) |
| `presence` | Supabase Presence tracking | No |

### Send flow

1. User hits send
2. Optimistic insert in local store (message appears immediately)
3. `INSERT INTO chat_messages` via Supabase client
4. `channel.send({ type: 'broadcast', event: 'message', payload })`
5. Other members receive via subscription, append to store
6. INSERT failure → inline error on message, retry option

### Typing indicators

- Broadcast `typing` event throttled to 1 per 2s
- Recipients show "X is typing..." for 3s, reset on new event
- No DB writes

### Channel lifecycle

- Subscribe to active group channel on selection
- Unsubscribe previous channel on switch
- On mount, subscribe to all group channels for unread badge updates (message event → increment count)

## Zustand Store (`chatStore`)

```typescript
interface ChatStore {
  groups: ChatGroup[]
  messages: Record<string, ChatMessage[]>   // group_id → messages
  unreadCounts: Record<string, number>       // group_id → count
  typingUsers: Record<string, string[]>      // group_id → user_ids

  activeGroupId: string | null
  sidebar: 'groups' | 'settings' | null

  fetchGroups: () => Promise<void>
  fetchMessages: (groupId: string, before?: string) => Promise<void>
  sendMessage: (groupId: string, content: string, media?: File) => Promise<void>
  markRead: (groupId: string) => void
  setSidebar: (panel: 'groups' | 'settings' | null) => void
  setActiveGroup: (groupId: string) => void

  createGroup: (name: string) => Promise<void>
  joinByInviteCode: (code: string) => Promise<void>
  addMember: (groupId: string, username: string) => Promise<void>

  onMessage: (groupId: string, message: ChatMessage) => void
  onTyping: (groupId: string, userId: string) => void
}
```

- `fetchMessages`: cursor pagination, 50 per page, older on scroll-up
- `sendMessage`: optimistic insert + DB write + broadcast
- `markRead`: updates `last_read_at` in `chat_members`
- `onMessage` for non-active groups: increment unread only

## Component Tree

```
Window (existing, with headerActions)
├── headerActions:
│   ├── ChatsPillButton — toggles groups sidebar
│   └── GroupPillButton — shows active group name, toggles settings
│
├── ChatSidebar (slide-over from left, animated)
│   ├── mode: 'groups'
│   │   ├── GroupListItem[] — avatar, name, unread badge, preview, timestamp
│   │   └── CreateGroupButton
│   └── mode: 'settings'
│       ├── Group name (editable)
│       ├── Members list
│       ├── Invite code / copy link
│       └── Leave group
│
├── MessageList (scrollable, cursor pagination on scroll-up)
│   ├── MessageBubble (sent) — right-aligned, primary tonal surface
│   ├── MessageBubble (received) — left-aligned, surface-raised
│   │   ├── Sender name (text-label, muted)
│   │   ├── Content (text-body, markdown)
│   │   ├── Media (thumbnail or file chip)
│   │   └── Timestamp (text-label, muted)
│   └── TypingIndicator — "Alice is typing..."
│
└── ChatInput
    ├── Textarea (auto-resize)
    ├── MediaAttachButton
    └── SendButton
```

### Header buttons

Window accepts `headerActions` prop. Two pill buttons:
- "Chats" (left): toggles sidebar to 'groups' view
- Active group name (right): toggles sidebar to 'settings' view

### Visual treatment

- Sent bubbles: `bg-primary` tonal, `text-on-primary`, right-aligned
- Received bubbles: `bg-surface-raised`, `text-on-surface`, left-aligned
- Bubble radius: `radius-lg`
- Shadows: `shadow-resting`
- Sidebar: `bg-surface-raised`, slides from left with spring animation

### Animations (per P6)

- Incoming messages from others: spring slide-in
- Own messages: immediate
- Sidebar open/close: spring slide from left
- Typing indicator: fade in/out

## Media Upload

**Storage path:** `chat/{group_id}/{message_id}/{filename}`

**Flow:**
1. File picked via button or drag-and-drop
2. Preview in ChatInput (thumbnail for images, filename for files)
3. On send: upload to Supabase Storage → get URL → insert message with `media_url` + `media_type`
4. Optimistic: blurred placeholder → swap on upload complete
5. Failure: inline error, retry button

**Supported types (MVP):** Images (jpg, png, gif, webp), files (pdf, documents)
**Size limit:** 10MB client-side enforcement
**RLS:** Bucket policy scoped to group membership

## Auth Gate

- Chat app checks auth on mount
- Unauthenticated: centered sign-in prompt with GoogleSignInButton
- Authenticated: load groups, connect channels
- RLS on all tables requires `auth.uid()`

## App Registration

```typescript
const chatApp: BuiltInApp = {
  source: 'built-in',
  type: 'chat',
  name: 'Chat',
  icon: MessageCircle,
  component: ChatApp,
  defaultPresentation: 'window',
  defaultSize: { width: 400, height: 500 },
  maxInstances: 1,
  reduce: (state, action, params) => { /* handle set_active_group, set_sidebar */ },
  summarize: (state) => `Chat — ${activeGroupName || 'no group selected'}`,
}
```
