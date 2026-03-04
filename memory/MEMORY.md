# Domus — Persistent Memory

## Entity-as-MCP (LIVE)
- `GET /api/entities/[id]/schema` and `POST /api/entities/[id]/call` are fully implemented
- Calendar, sounds, folder all have `getSchema` in their `BuiltInApp` definition
- `reduce` must be pure — no DB calls. Side effects (child patches, etc.) go in the call route AFTER writing entity state
- Side-effect failures are caught/logged but never fail the main response
- The concurrent execution order in `Promise.all` for child patches: all selects fire before any updates — mock order matters in tests

## Folder Data Model
- `type: 'folder'`, `presentation: 'folder'`, `state: { child_ids: string[] }`
- Children: `presentation: 'card'`, `state: { ..., _folderId: '<folder-id>' }` — visibility controlled by `_folderId`, NOT presentation
- Scattering children also get `_scatterOrigin` in state; `getVisibleEntities` / canvas `visible` filter includes them (`_folderId && !_scatterOrigin` → hidden)
- On eject/scatter: `_folderId` removed (set to undefined → omitted from JSON), `presentation: 'card'`
- **Cards can NEVER have `presentation: 'hidden'`** — use `archived: true` for delete, `_folderId` for folder membership
- Agent uses `call_entity_tool` (not `update_entity`) to manage children
- Folder is in `allBuiltInApps` but NOT `dockApps` — structural app, not user-launchable

## Registry Pattern
- `allBuiltInApps` — all types (including structural like folder)
- `dockApps` array — only user-launchable apps (chat, calendar, settings, sounds)
- `getAppType('folder')` works; `getDockApps()` returns 4 apps

## BuiltInApp Actual Interface (apps/_types.ts)
- Plain TypeScript — no Zod schemas in the interface
- Fields: `source`, `type`, `name`, `icon`, `component`, `windowActions?`, `defaultPresentation`, `defaultSize`, `maxInstances?`, `reduce`, `summarize`, `summarizeOn?`, `summarizeDebounceMs?`, `getSchema?`
- `defaultPresentation: Presentation` = `'window' | 'card' | 'folder' | 'hidden'`
- `getSchema?` optional — implement when agent needs to call tools on this entity
- `summarizeOn?: string[]` — actions that trigger AI summary; undefined=all, []=never
- `summarizeDebounceMs?: number` — debounce delay before firing AI summary (default 0)

## AI Entity Summary Generation (LIVE)
- `POST /api/entities/[id]/summarize` — Gemini call + Supabase write
- Package: `@google/genai` (NOT the deprecated `@google/generative-ai`)
- Model: `process.env.GEMINI_SUMMARY_MODEL ?? 'gemini-3.1-flash-lite-preview'`
- Env vars: `GOOGLE_API_KEY` (required), `GEMINI_SUMMARY_MODEL` (optional override)
- AppRenderer fires debounced fetch after dispatch when action is in `summarizeOn`
- Failure is silent to the user — existing summary preserved, error logged server-side
- Mock GoogleGenAI in tests with `function` constructor, not arrow: `(GoogleGenAI as Mock).mockImplementation(function() { return {...} })`

## Presentation Rules (lib/presentationRules.ts)
- `window`/`hidden` → only for built-in apps with `defaultPresentation === 'window'` (chat, calendar, settings, sounds)
- `folder` → only for `type: 'folder'`; immutable
- `card` → everything else (note, image, unknown types)
- Cards can NEVER be `hidden` — use `archived: true` for delete; use `_folderId` in state for folder membership
- `coercePresentation(type, requested)` enforces rules; used in CDC handler + PATCH route
- CDC coercion in `entitySync.ts`: if agent writes bad presentation directly to DB, CDC corrects it locally AND writes fix back to DB via `syncEntity(corrected)`
- Migration `20260304000003`: archived all orphaned `presentation='hidden'` card entities; fixed active folder children to `'card'`

## Entity API Routes (live as of 2026-03-04)
- `POST /api/entities` — create with validated presentation; handles singleton `maxInstances: 1`
- `PATCH /api/entities/[id]` — update with presentation coercion (never rejects, always corrects)
- `DELETE /api/entities/[id]` — archive; folders with children → 409 unless `?force=true`
- Auth: service token (`Bearer`) + `?space_id=` OR user session cookie (same `resolveAuth` pattern as `/call`)

## Pre-existing Test Failures (not ours)
- `core/__tests__/themeStore.test.ts` — `localStorage.clear is not a function` (jsdom mock issue)
- `apps/__tests__/settings.test.tsx` — same root cause (themeStore dependency)
- `core/supabase/__tests__/entitySync.test.ts` — unhandled rejection warning on teardown (vitest worker closes while import pending) — all 22 tests pass

## ID Generation Rule
- `crypto.randomUUID()` for entity IDs going to Supabase (uuid column)
- `ulid()` only for local-only IDs that never touch DB
