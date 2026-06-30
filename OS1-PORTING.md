# OS1 vs Domus: Continue Rebuild or Fix the Guts?

## Context

You built OS1 as a spatial agent-first OS. It works — the visual components are rich, nuanced, and polished. But the architecture underneath didn't scale: giant JSONB state blob, custom WebSocket server, 48 agent tools, 5-file-per-app registration ceremony, two parallel entity systems. You started Domus as a clean-sheet rebuild on a stronger foundation (Next.js 15, Supabase, unified entity model, 5 tools). But you're finding it hard to replicate all the visual nuances from OS1.

This analysis answers: **should you keep going with Domus, or go back and fix OS1's internals?**

---

## The Numbers

| Dimension | OS1 | Domus |
|---|---|---|
| **Frontend code** | ~55,000 lines across 100+ components | ~2,500 lines across ~25 components |
| **Backend code** | ~33,000 lines (Python FastAPI) | 0 lines (not started) |
| **Total components** | 100+ (.tsx files) | 25 (.tsx files) |
| **Agent tools** | 48 | 0 (arch says 5) |
| **Database tables** | ~14 (SQLAlchemy) | 3 (Supabase, via migrations) |
| **Tests** | ~12,000 lines backend, thin frontend | ~15 test files, TDD approach |
| **Git commits** | 462 | ~10 |
| **Deployed?** | Yes (Vercel + Railway) | No |
| **Users?** | None (pure reference) | None |

---

## What OS1 Has That Domus Doesn't (Yet)

### Visual Components (the hard part you're struggling with)

**Fully built in OS1, skeleton or absent in Domus:**

| Component | OS1 (lines) | Domus (lines) | Gap |
|---|---|---|---|
| Window (chrome + resize + drag + focus) | 443 + WindowContent + WindowHeader | ~200 (rAF resize, direction detection, interaction-aware transitions) | Medium — Domus has resize direction detection, rAF resize, transparent header with close + options. Missing: focus ring animations, Safari optimization |
| Card (text + image variants, loading states, shimmer, glassmorphism) | 431 (6 visual states, framer-motion shadows, editing shimmer overlay, mobile tap) | 48 (summary + metadata only, no variants, no loading states) | Very large |
| PromptInput (3-state layout, file drag/drop, context chips, scroll gradients, clipboard paste) | 1,171 (IDLE/CLICKED/BIG states with spring/tween transitions, resize measurement via DOM cloning, drag-and-drop, context menu) | 180 (text + send + context chips structure, no layout state machine, no file handling) | Very large |
| Chat bubbles (agent iterations, reasoning sections, tool calls, streaming) | ~800 across 8 components | 0 | Complete gap |
| Notes editor (TipTap rich text, formatting toolbar, editable title) | ~600 across 4 components | 0 | Complete gap |
| Canvas entities layer (embedded entities, spatial positioning) | ~400 | Basic SpaceRenderer exists | Large |
| Profile/auth pages | ~500 | SignInButton only | Large |
| FloatingSideMenu (app launcher) | ~300 | 0 | Complete gap |
| Snapshot/image viewer | ~400 | 0 | Complete gap |
| Mobile OS (entire mobile layout) | ~3,000 across 15+ components | — | **Out of scope — never port.** Web is desktop-only; see `core/platform/`. |

### Motion Nuances Specifically

OS1 has these motion behaviors that Domus hasn't replicated:

1. **Window resize direction detection** — OS1 tracks whether you're expanding or contracting and feeds that into ResizeHandleVisual's animation state. Domus only has idle/hover (no active, no direction-awareness).

2. **PromptInput 3-state layout machine** — IDLE (280px pill) → CLICKED (350px horizontal) → BIG (350px vertical stack). Spring animation for IDLE↔CLICKED, tween for CLICKED↔BIG. Domus has the structure but no state machine.

3. **Card shadow animation** — OS1 animates `boxShadow` via framer-motion between states (default → inFocus → inFocus-special). Domus uses static Tailwind shadow classes with CSS transitions.

4. **Loading shimmer gradients** — OS1 has animated gradient overlays for loading-text and loading-image card states using framer-motion `backgroundPosition` animation. Domus has none.

5. **Editing shimmer on images** — When the agent is regenerating an image, OS1 shows a shimmer + backdrop blur overlay. Not in Domus.

6. **~~Window maximize/minimize transition~~** — Not applicable. Domus windows have close only (no maximize/minimize). Close hides the entity (`presentation: 'hidden'`).

7. **Scroll-driven gradient fades** — OS1's PromptInput shows gradient overlays at top/bottom of textarea that fade based on scroll position. Domus has none.

8. **Safari-specific style optimizations** — OS1 has a `getSafariOptimizedStyles()` utility that applies browser-specific workarounds. Domus has none.

### Infrastructure (the "guts" that work)

- **Auth flow**: Google OAuth, email/password, phone auth, guest mode with data transition
- **WebSocket real-time**: Custom but functional — agent streaming, state sync, chat
- **Agent loop**: Multi-LLM (Claude, GPT, Gemini), 48 tools, parallel execution, Mem0 memory
- **Chat system**: Group chat, DMs, typing indicators, unread tracking, message attachments
- **File storage**: Cloudflare R2 with presigned URLs
- **Image generation**: Gemini integration with upload pipeline

---

## What's Actually Wrong With OS1's Guts

### Unfixable Without Major Rewrite (Architecture-Level)

1. **JSONB blob state store** — The entire canvas state is a single JSON column. Every mutation serializes everything. No per-entity queries, no concurrent editing, no indexing. Fixing this means migrating to a per-entity table... which is exactly what Domus's `entities` table is.

2. **Two parallel entity systems** — `containedEntityStore.ts` (624 lines, windows) and `embeddedEntityStore.ts` (canvas entities). These have different APIs, different state shapes, different update patterns. Unifying them means rewriting most of the frontend state layer... which is exactly what Domus's single `entityStore.ts` does.

3. **48 tools → 5 tools** — The agent has 48 special-purpose tools. The v2 vision is 5 generic tools operating on entities. This isn't a refactoring — it's a fundamental redesign of how the agent interacts with the system.

4. **Custom WebSocket → Supabase Realtime** — OS1 has a bespoke WebSocket protocol (JSON actions, custom heartbeat, manual auth token handling). Replacing this with Supabase CDC means rewriting all real-time communication... which is Domus's architecture from day one.

5. **5-file app registration** — Adding an app touches appRegistry, agentInterface, tool definitions, context builder, and state model. Domus's "drop a folder in apps/" architecture requires none of this.

6. **Custom JWT auth → Supabase Auth** — OS1 implements its own auth with python-jose, passlib, bcrypt. Migrating to Supabase Auth means ripping out the entire auth layer.

### Fixable Incrementally (Code-Level)

- Dead code cleanup (4 backup messaging files, 35MB core dump, stray screenshots)
- 17 duplicate path aliases → consolidate
- Mixed .js/.tsx → standardize
- Missing optimistic locking on state blob → add version enforcement
- TODO items (16 messaging gaps, filesystem mock data)

**The fixable stuff doesn't address any of the architectural problems.** The REFACTORING_PLAN.md in OS1 itself acknowledges this — its 7-phase plan basically rewrites the entity store, app registry, and context pipeline, which is most of the system.

---

## The Core Tradeoff

### Option A: Continue Domus rebuild (current approach)
**What you keep:** Clean architecture, unified entity model, Supabase (auth + realtime + storage), TDD process, 5-tool agent, drop-in apps, proper design tokens.

**What you lose/delay:** ~55K lines of battle-tested visual components, all the motion nuances, the working agent loop, the deployed product.

**Estimated work to reach OS1 visual parity:** The gap is roughly 50+ components with ~45,000 lines of UI code. Even being generous and saying Domus's cleaner architecture lets you write these at 60% the line count (because Tailwind is more concise than inline styles, and the architecture is simpler), that's still ~27,000 lines of frontend code. At the pace of the last week (~2,500 lines), that's **10-12 weeks of pure frontend work** before you have visual parity — and that's before building the agent, chat system, or any backend.

### Option B: Fix OS1's guts
**What you keep:** All 55K lines of visual components, all motion nuances, deployed product, agent loop, chat system.

**What you lose:** The clean architecture dream. You'd be incrementally migrating OS1 toward Domus's architecture while keeping the UI running.

**Estimated work:** The REFACTORING_PLAN.md describes 7 phases. Phases 1-3 alone (entity store unification, declarative app system, context pipeline) touch the majority of the frontend. Phase 4+ (Supabase migration, auth migration) touches the entire backend. This is also **months of work**, but the product stays functional throughout.

### Option C (Recommended): Transplant, Don't Replicate

**Port OS1's visual components into Domus's architecture — don't rewrite them from scratch.**

The key insight: **OS1's visual components are mostly self-contained.** A Card component takes props and renders JSX with inline styles. The same component can be made to take props and render JSX with Tailwind classes. The visual logic (state machines, motion configs, layout calculations) transfers directly — it's the styling delivery and state management wiring that changes.

Concretely:

1. **Keep building on Domus's foundation** — the architecture is correct and the infrastructure (Supabase, Next.js, entity model) is what you want.

2. **Port OS1 components systematically, not from memory** — Open the OS1 component side-by-side with the Domus equivalent. Extract every visual state, every motion value, every interaction handler. Translate inline styles to Tailwind classes. Wire to Domus's entity store instead of OS1's dual stores.

3. **Port in priority order:**
   - **Window** (core container — rAF resize, interaction-aware transitions, focus animations)
   - **Card** (bring over all 6 states, loading shimmer, image variant)
   - **PromptInput** (bring over the 3-state layout machine, file handling, scroll gradients)
   - **Chat components** (agent iterations, reasoning sections — these are new in Domus)
   - **Notes editor** (TipTap integration is largely portable)
   - **Everything else** follows naturally

4. **Port the motion tokens literally** — Copy OS1's spring configs, easing curves, and duration values into Domus's `lib/motion.ts`. Where Domus's design direction intentionally differs (e.g., less bounce), keep Domus's values. Where OS1 just has more granularity (e.g., 11 durations vs 3), add the missing tiers.

5. **The agent and backend are separate concerns** — Build Domus's Python FastAPI agent service independently. It doesn't share code with OS1's backend (different DB, different tools, different protocol). This work happens in parallel with frontend porting.

### Why Option C over A or B

- **Over pure Option A** (rewriting from scratch): You're not trying to remember what the components should look like — you have the source code right there. Porting is 3-5x faster than reimagining. A Card component that took days to perfect in OS1 can be ported in hours.

- **Over Option B** (fixing OS1): OS1's architecture problems are in the plumbing, not the walls. You can't incrementally migrate a JSONB blob to a per-entity table while keeping the two-store frontend working. The migration path has so many intermediate states that each one is a potential regression. Domus's architecture is already correct — it's faster to bring the walls to the new plumbing than to replace plumbing under a standing building.

---

## Recommendation

**Continue with Domus, but change your approach to the visual components.**

Stop trying to rebuild them from memory or from the design spec alone. Instead:

1. Open the OS1 component in one pane, the Domus component in another
2. For each visual behavior (hover state, loading animation, resize interaction), read the exact implementation from OS1
3. Translate the styling from inline JS objects to Tailwind classes
4. Wire state to Domus's entity store instead of OS1's containedEntityStore/embeddedEntityStore
5. Keep the motion logic (state machines, spring configs, rAF patterns) — these are framework-agnostic

**The nuances you're struggling to replicate aren't lost — they're in the OS1 source code, waiting to be transplanted.**

### Immediate next steps

1. Create a porting checklist: enumerate every OS1 visual component with its states and interactions
2. Establish the porting pattern on Window (it's the most complex container component)
3. Port Card, PromptInput, and chat components in that order
4. Build the agent service in parallel (it's independent of the frontend)

---

## Decision Summary

| Factor | Domus Rebuild (current approach) | Fix OS1 | Transplant (recommended) |
|---|---|---|---|
| Architecture quality | Already correct | Months of migration | Already correct |
| Visual fidelity | Slow — reimagining from scratch | Already there | Fast — porting from source |
| Time to visual parity | 10-12 weeks | 0 (already there) | 3-4 weeks |
| Time to working product | 14-16 weeks | Product works now but architecture debt grows | 8-10 weeks |
| Risk of getting stuck | High (current pain point) | High (migration complexity) | Low (systematic porting) |
| Dev process quality | Strong (TDD, scenarios, hooks) | Weak (no tests on frontend) | Strong (inherits Domus process) |
