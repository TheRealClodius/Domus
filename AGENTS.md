# Agents

## Cursor Cloud specific instructions

### Project overview
Domus is a Next.js 16 / React 19 spatial workspace frontend. The AI agent backend (Python FastAPI) lives in a separate repository and is not required for the frontend to compile, start, or serve the login page.

### Commands
See `CLAUDE.md` and `package.json` scripts for the canonical command list. Key commands:
- `npm run dev` — starts Next.js dev server on port 3000
- `npm run lint` — Biome check (lint + format)
- `npm run test` — Vitest (single run)
- `npm run test:watch` — Vitest in watch mode

### Environment variables
No `.env.example` exists. The app requires at minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Without real Supabase credentials the dev server starts and renders the login page, but auth and data operations will fail. Create a `.env.local` with placeholder values if real credentials are not available.

### Pre-existing lint/test issues
- Biome lint exits non-zero due to a handful of fixable style warnings (e.g. `useArrowFunction`). These are pre-existing.
- Vitest: 118/121 test files pass (1172/1176 tests). The 3 failing files and 2 unhandled rejections are pre-existing in the codebase.

### Debug login (dev-only)
Navigate to `http://localhost:3000/api/debug/login` to sign in as a stable debug user without Google OAuth. This endpoint:
- Only works when `NODE_ENV=development`
- Creates a Supabase user `debug-agent@domus.dev` (ID `a0000000-0000-4000-8000-000000000001`) on first call
- Signs in via magic link token exchange (email/password auth is disabled in the Supabase project), sets cookies, and redirects to `/`
- On first login, the home page automatically creates a space ("My Space") for the debug user
- Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- The agent chat prompt bar will show "Could not reach the agent" because the Python FastAPI backend lives in a separate repo

### Gotchas
- The package manager is **npm** (not pnpm/yarn). A `package-lock.json` is present; use `npm ci` for deterministic installs.
- Node.js 22 is required (CI uses `node-version: 22`).
- Biome 2 replaces ESLint + Prettier. Configuration is in `biome.json`.
- No Husky/lint-staged hooks are configured. Claude Code hooks (`.claude/hooks/`) run Biome lint and Vitest on file edits but are not relevant to Cursor Cloud.
