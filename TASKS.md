# Domus — Tasks

## Done

- Supabase project created (Fram Design org → Domos project)
- `001_init.sql` migration applied — users, spaces, space_templates, entities tables, RLS policies, indexes, `jsonb_merge_patch` function
- Test user + space seeded (`supabase/seed.sql`)
- Google Sign-In configured (Google Cloud project `domus-fram`, Supabase Auth provider enabled)
- Env files populated in both repos
- CLIs installed: Supabase, Vercel, gcloud
- `content` column added to entities (decision 58 — markdown-first model), FTS index updated to cover content + summary
- M3 tonal system upgrade: 5-palette-tier generation (primary, secondary, tertiary, neutral, neutral-variant) from seed hue. Scheme variants (tonal, vibrant, muted, expressive, monochrome). Surface hue tracks seed hue. Elevation-chroma boosts explored and reverted (imperceptible at low chroma). M3 state layer hover pattern (`hover:bg-on-surface/8`). Settings UI: scheme variant picker, intensity slider, saved themes with variant capture.
- Profile panel: dropdown (avatar click) with section navigation (General, Connections, Billing, Usage) — each opens FullScreenSheet. General: avatar upload, name edit, custom instruction textarea. Connections: Google Calendar + Google Drive rows (Drive UI-only placeholder). Billing/Usage: display-only. Profile data in Zustand store (fetch once, optimistic updates). New columns: `preferences jsonb` on users table, `avatars` storage bucket. API routes: `/api/user/profile` (GET/PATCH), `/api/user/avatar` (POST).

---

## TODO

> **Note:** These tasks are directional priorities, not implementation specs. Before starting any task, break it down into a detailed plan with specific subtasks, file-by-file scope, and test cases. Use `/start-task` to do this — it will find the relevant scenarios, create a feature branch, and produce an actionable spec.

### 1. App Shell & Design Token Pipeline

The foundation — nothing renders without this.

**Design tokens:**
- `tokens/seeds.ts` — base values: brand hues (primary 264°, agent 40°), secondary/tertiary chroma tiers, neutral-variant outline chroma, scheme variant types (tonal/vibrant/muted/expressive/monochrome), type scale, spacing scale (4px base), radius scale, shadow levels
- `tokens/palettes.ts` — M3-inspired 5-palette-tier generation from seed hue using OKLCH. Scheme variant resolver controls chroma/hue relationships. Surface hue tracks seed hue. Secondary (same hue, lower chroma), tertiary (offset hue +60°, medium chroma), neutral-variant (outlines). Gaussian chroma utility for future lightness-adaptive chroma
- `tokens/tokens.css` — CSS custom properties on `:root` and `[data-theme="dark"]`. All semantic roles: 7-level surface scale, on-surface/on-surface-muted, outline/outline-variant (neutral-variant chroma), primary/on-primary/primary-container/on-primary-container, secondary/tertiary (same pattern), agent/error containers, 6 categorical accents, pill/chip/glass/shadow tokens
- Tailwind v4 `@theme inline` consuming custom properties — `bg-surface`, `text-on-surface`, `border-outline`, etc.

**App shell:**
- `next.config.ts` — minimal config
- `tsconfig.json` — strict mode, path aliases
- `app/layout.tsx` — root layout: html with `data-theme`, system font stack, tokens.css import
- `core/supabase.ts` — Supabase client singleton (browser + server variants)
- `lib/types.ts` — Entity, Space, User, AppDefinition, AppProps types
- `lib/motion.ts` — spring parameters (crisp settle, minimal overshoot), three duration tiers (fast/medium/slow), agent glow fade timing
- `lib/id.ts` — ULID generation

**Validate:** Tokens render correctly in both light/dark themes. Tailwind classes map to semantic tokens. No raw color values anywhere.

---

### 2. Auth Flow & Space Loading

Connect to Supabase Auth. Make the app navigable.

- `app/page.tsx` — landing page: check session, redirect to active space or show sign-in
- `app/auth/callback/route.ts` — Supabase OAuth callback handler
- Auth middleware or layout guard — redirect unauthenticated users to landing
- `app/space/[id]/page.tsx` — space page shell: fetch space, fetch visible entities, render SpaceRenderer
- Space creation from "Starter" template on first sign-in (query `space_templates` where `is_system = true`, stamp entities into new space)
- Set `active_space_id` on user profile after space creation/switch

**Validate:** Google sign-in works end-to-end. New user gets a space from the Starter template. Returning user loads their active space. Unauthenticated access redirects to landing.

---

### 3. Entity Store + Canvas + Entity Chrome

The spatial interface — the heart of the product.

**Entity store:**
- `core/entityStore.ts` — Zustand store holding visible entities only (`window`, `card`, `sidebar`). Operations: `upsert`, `remove`, `bumpZIndex`, `loadSpace` (initial fetch). Hidden entities stay in Postgres.
- Supabase Realtime CDC subscription per space — idempotent upserts on INSERT/UPDATE, remove on DELETE. Filter out `presentation: 'hidden'`
- Enable Realtime on `entities` table in Supabase (CDC)

**Canvas:**
- `core/canvas/SpaceRenderer.tsx` — the main UI component. Renders the canvas (inset card with `surface-dim`), entity layer, App Dock placeholder, AgentChat placeholder
- `@use-gesture/react` for canvas pan (click-drag empty space, middle-mouse) and zoom (scroll wheel, pinch toward cursor). Zoom range 25%–200%
- Viewport culling — only render entities within visible bounds + margin buffer
- Optional subtle dot grid at low opacity for spatial orientation

**Entity chrome:**
- `core/entity/Window.tsx` — window chrome: title bar (controls top-left: close/minimize/maximize, title, app icon right), drag via title bar (`@use-gesture`), resize via corner/edge handles, close = `presentation: 'hidden'`, focus = bump z-index + elevated shadow, agent glow (warm border shadow that fades, `created_by === 'agent'` + recently updated). `motion` for agent-origin animations (spring physics), instant transforms for user drag
- `core/entity/CanvasCard.tsx` — card chrome: fixed size, summary preview, metadata row (type + timestamp), click to open sheet. Hover: gradient scrim with action icons
- `core/layout/BottomSheet.tsx` — full-width overlay from bottom. Canvas scales down + dims behind (iOS depth). Spring animation. Close via button or click visible canvas above
- Hybrid percentage/pixel positioning: `locked: false` = percentage of viewport, `locked: true` = raw pixels (after user drag)

**Validate:** Entities render at correct positions. Windows drag, resize, close, focus. Cards show summaries. Bottom sheet opens from card tap. Canvas pans and zooms. Agent glow appears on agent-created entities.

---

### 4. Prompt Bar + SSE Agent Connection

Connect the frontend to the working agent backend.

**SSE proxy:**
- `app/api/agent/route.ts` — POST handler: validate Supabase auth cookie → extract `user_id` → forward to Railway agent service with `Authorization: Bearer <DOMUS_SERVICE_TOKEN>`. Stream SSE response back to client. Payload: `{ space_id, message, user_id, viewport, focused_entity_id, visible_entity_ids }`

**SSE client:**
- Parse event types: `text_delta`, `tool_call_start`, `tool_call_result`, `done`, `error`
- On `tool_call_result` for `create_entity`/`update_entity`: upsert entity into Zustand store immediately (SSE is primary channel, CDC confirms)

**Chat UI:**
- `core/chat/AgentChat.tsx` — prompt bar (fixed bottom-center, pill-shaped, glassmorphic `backdrop-filter: blur()`) + conversation panel (expands upward on send, glassmorphic). Enter to send, Shift+Enter for newline
- User messages right-aligned, agent left-aligned. No avatars. Timestamps on hover
- Tool call chips inline: shimmer while in progress (`[creating note...]`), resolve to entity name as clickable link (focuses entity on canvas)
- Streaming text display — text appears in chunks as `text_delta` events arrive
- Agent thinking indicator (animated ellipsis)

**Validate:** Send a message → agent responds with streaming text. Agent creates a note → it appears on canvas with agent glow, chip in chat resolves to entity link. SSE reconnects on drop.

---

### 5. Notes App + App Registry

The first app — proves the full architecture end-to-end.

**Unified registry:**
- `apps/_types.ts` — `AppType = BuiltInApp | ComposedApp`. `BuiltInApp`: full definition with component, reducer, summarizer, schema. `ComposedApp`: metadata only (label, defaults, blockSummary) — always renders via BlockRenderer
- `apps/_registry.ts` — built-in apps via `import.meta.glob('./*/index.ts', { eager: true })`. Composed apps derived from entity store at runtime (entities with `state.blocks` and type not in built-in registry). Unified lookup via `getAppType(type)` — built-in takes priority

**Notes app:**
- `apps/notes/index.ts` — schema (Zod v4), reducer (handle user edits), summarizer (first line or truncated content)
- `apps/notes/NotesApp.tsx` — in window/card: `react-markdown` rendering of `entity.content`. In sheet (via BottomSheet): Tiptap rich text editor for full editing. User edits dispatch through reducer → write to Supabase

**App rendering:**
- `core/entity/AppRenderer.tsx` — unified dispatch: `getAppType(entity.type)` → `BuiltInApp` renders custom component, `ComposedApp` renders BlockRenderer, unknown + `state.blocks` renders BlockRenderer (first-encounter fallback), unknown + no blocks renders error card. Wrapped in React Error Boundary (crashed app shows fallback card with type + summary + retry)
- `app/api/schemas/route.ts` — serves app schemas as JSON (import registry, convert Zod schemas via `z.toJSONSchema()`). Agent service fetches + caches

**Validate:** Note entities render markdown in windows and cards. Opening a note card in a sheet shows Tiptap editor. User edits persist to Supabase. Agent creates notes via tool calls and they render correctly. `/api/schemas` returns valid JSON schemas.
