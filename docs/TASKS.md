# Domus — Tasks

## Done

- Supabase project created (Fram Design org → Domos project)
- `001_init.sql` migration applied — users, spaces, space_templates, entities tables, RLS policies, indexes, `jsonb_merge_patch` function
- Test user + space seeded (`supabase/seed.sql`)
- Google Sign-In configured (Google Cloud project `domus-fram`, Supabase Auth provider enabled)
- Env files populated in both repos
- CLIs installed: Supabase, Vercel, gcloud
- `content` column added to entities (decision 58 — markdown-first model), FTS index updated to cover content + summary

---

## TODO

### 1. Enable Realtime on `entities` table
Turn on CDC for the entities table in Supabase. Do this when the frontend is ready to consume realtime updates.
