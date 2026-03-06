# Domus — Tasks

> **The canonical task tracker is [`docs/TASKS.md`](docs/TASKS.md).** That file is the source of truth for all in-progress, up-next, and completed work items.

---

## Historical Milestones (Done)

- Supabase project created (Fram Design org → Domos project)
- `001_init.sql` migration applied — users, spaces, space_templates, entities tables, RLS policies, indexes, `jsonb_merge_patch` function
- Test user + space seeded (`supabase/seed.sql`)
- Google Sign-In configured (Google Cloud project `domus-fram`, Supabase Auth provider enabled)
- Env files populated in both repos
- CLIs installed: Supabase, Vercel, gcloud
- `content` column added to entities (decision 58 — markdown-first model), FTS index updated to cover content + summary
- M3 tonal system upgrade: 5-palette-tier generation (primary, secondary, tertiary, neutral, neutral-variant) from seed hue. Scheme variants (tonal, vibrant, muted, expressive, monochrome). Surface hue tracks seed hue. Elevation-chroma boosts explored and reverted (imperceptible at low chroma). M3 state layer hover pattern (`hover:bg-on-surface/8`). Settings UI: scheme variant picker, intensity slider, saved themes with variant capture.
- Profile panel: dropdown (avatar click) with section navigation (General, Connections, Billing, Usage) — each opens FullScreenSheet. General: avatar upload, name edit, custom instruction textarea. Connections: Google Calendar + Google Drive rows (Drive UI-only placeholder). Billing/Usage: display-only. Profile data in Zustand store (fetch once, optimistic updates). New columns: `preferences jsonb` on users table, `avatars` storage bucket. API routes: `/api/user/profile` (GET/PATCH), `/api/user/avatar` (POST).
- App Shell & Design Token Pipeline — complete (see Design Token System + Project Scaffolding in `docs/TASKS.md` Completed)
- Auth Flow & Space Loading — complete (see Login Gate in `docs/TASKS.md` Completed)
- Entity Store + Canvas + Entity Chrome — complete (see Canvas Layer + Entity Components in `docs/TASKS.md` Completed)
- Prompt Bar + SSE Agent Connection — complete (see Chat/Prompt Input + Agent Conversation Display in `docs/TASKS.md` Completed)
- App Registry — complete (see App System Phase 1 in `docs/TASKS.md` Completed)
