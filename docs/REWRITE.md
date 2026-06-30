# Domus Technical Rewrite

Living plan for the architectural overhaul. See the agent conversation for full phase breakdown.

## Desktop-Only Policy

Domus web is **desktop-only**. This is enforced in code, not documentation alone.

| Rule | Detail |
|------|--------|
| Minimum viewport | 1280×720 (`lib/platform.ts`) |
| Below threshold | `DesktopOnlyPlaceholder` — no app chrome, no degraded layout |
| Responsive breakpoints | No `sm:`, `md:`, `lg:` layout classes in `core/` or `apps/` |
| Canvas input | Wheel zoom + drag pan only — no pinch-to-zoom |
| Touch | `touchAction: 'none'` on drag surfaces only (pointer drag, not mobile layout) |
| Native mobile | Out of scope for web rewrite |

**Implementation:** `core/platform/DesktopOnlyGate.tsx` wraps all routes in `app/layout.tsx`.

## Rewrite Phases

1. **Store decomposition** — `entityStore` / `spatialStore` / `agentUiStore`
2. **Canvas kernel** — viewport, layout engine, animation director
3. **Entity presentation pipeline** — `EntityShell` + `EntityBody` + `resolveEntityView`
4. **Agent console rename** — `core/chat/` → `core/agent-chat/`, protocol package
5. **Platform completion** — space switcher, generated apps, visual port
6. **Cleanup** — delete shims, sync docs
7. **Desktop-only strip** — ✅ done early (`cursor/rewrite-desktop-only-5bf4`)

## Subagent Branch Convention

`cursor/rewrite-<phase>-5bf4`
