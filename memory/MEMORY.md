# Domus — Persistent Memory

## Entity-as-MCP (LIVE)
- `GET /api/entities/[id]/schema` and `POST /api/entities/[id]/call` are fully implemented
- Calendar, sounds, folder all have `getSchema` in their `BuiltInApp` definition
- `reduce` must be pure — no DB calls. Side effects (child patches, etc.) go in the call route AFTER writing entity state
- Side-effect failures are caught/logged but never fail the main response
- The concurrent execution order in `Promise.all` for child patches: all selects fire before any updates — mock order matters in tests

## Folder Data Model
- `type: 'folder'`, `presentation: 'folder'`, `state: { child_ids: string[] }`
- Children: `presentation: 'hidden'`, `state: { ..., _folderId: '<folder-id>' }`
- On eject/scatter: `_folderId` removed (set to undefined → omitted from JSON), `presentation: 'card'`
- Agent uses `call_entity_tool` (not `update_entity`) to manage children
- Folder is in `allBuiltInApps` but NOT `dockApps` — structural app, not user-launchable

## Registry Pattern
- `allBuiltInApps` — all types (including structural like folder)
- `dockApps` array — only user-launchable apps (chat, calendar, settings, sounds)
- `getAppType('folder')` works; `getDockApps()` returns 4 apps

## BuiltInApp Actual Interface (apps/_types.ts)
- Plain TypeScript — no Zod schemas in the interface
- Fields: `source`, `type`, `name`, `icon`, `component`, `windowActions?`, `defaultPresentation`, `defaultSize`, `maxInstances?`, `reduce`, `summarize`, `getSchema?`
- `defaultPresentation: Presentation` = `'window' | 'card' | 'folder' | 'hidden'`
- `getSchema?` optional — implement when agent needs to call tools on this entity

## ID Generation Rule
- `crypto.randomUUID()` for entity IDs going to Supabase (uuid column)
- `ulid()` only for local-only IDs that never touch DB
