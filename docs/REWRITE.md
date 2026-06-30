# Domus Technical Rewrite

Living plan for the architectural overhaul.

## Desktop-Only Policy

Domus web is **desktop-only**. Minimum viewport **1280×720**. See `core/platform/DesktopOnlyGate.tsx` and DESIGN-DIRECTION **P14**.

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Docs freeze | Partial | `docs/REWRITE.md`; scenarios still auth-required |
| 1 Store split | **Done** | `core/stores/{entity,spatial,agentUi}Store.ts` |
| 2 Canvas kernel | **Done** | `viewportStore`, `CanvasViewport`, `animationDirector` |
| 3 Entity pipeline | **Done** | `resolveEntityView`, `EntityShell`, `EntityBody` |
| 4 Agent rename | **Done** | `core/agent-chat/` |
| 5 Platform | **Partial** | Space switcher done; generated apps hardening deferred |
| 6 Cleanup | Pending | Remove dead exports, doc sync |
| 7 Desktop-only | **Done** | PR #67 |

## Store Boundaries

| Store | Owns |
|-------|------|
| `entityStore` | Entity records, focus, CRUD, hydrate — **DB mirror** |
| `spatialStore` | Selection, folder gather/scatter/eject |
| `agentUiStore` | Agent attention rings, pending entities |

`entitySync` subscribes **only** to `entityStore`.

## Canvas Input (desktop)

- Wheel zoom, middle-mouse / space+drag pan via `CanvasViewport`
- No pinch-to-zoom
- Entity drag via `@use-gesture` on chrome components

## Subagent Branch Convention

`cursor/rewrite-<phase>-5bf4`
