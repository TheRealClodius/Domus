# Runtime App Generation — Findings

**Spike:** 2026-02-19-runtime-app-generation
**Branch:** `spike/runtime-apps`

---

## What worked

### Dock integration
Composed apps appear in the App Dock with dynamic Lucide icons (via `icons` map lookup from kebab-case names). Divider separates built-in from composed. Click-to-reopen/focus uses the same singleton pattern as built-in apps. This is solid and should ship.

### Builder agent pipeline
The builder runs as an autonomous `asyncio.create_task`, calls Claude Sonnet, and writes blocks to Supabase one by one. The pipeline itself works: entity created → builder launched → blocks written → `finish_build` clears the flag. Build times are ~15-40s for a typical app.

### Builder observability
Added structured logging (`builder_start`, `builder_turn_start`, `builder_tool_call`, `builder_model_text`, `builder_error`) + a dedicated `logs/builder.jsonl` file handler + `scripts/watch-builder.py` for real-time monitoring in a separate terminal. Critical for debugging — without this, builds fail silently.

### CDC auth fix
Supabase Realtime CDC was completely silent — browser showed `SUBSCRIBED` but received zero events. Root cause: `@supabase/ssr`'s `createBrowserClient` stores the auth JWT in cookies for REST requests but does NOT automatically pass it to the Realtime WebSocket. Fix: call `supabase.realtime.setAuth(session.access_token)` before subscribing + keep it in sync via `onAuthStateChange`. Without this, `auth.uid()` is null in the realtime RLS context and all events are silently filtered.

---

## What didn't work

### Blocks as an abstraction — dead end

Blocks are the wrong primitive. They're a fixed menu of layout widgets (heading, checklist, table, metric, progress, divider, list, key-value, text). The builder picks from this menu and the frontend renders them. Problems:

1. **No interactivity.** Checkboxes don't toggle. Buttons don't click. There's no way to express "when X happens, update Y." Blocks are data, not components.

2. **Hardcoded in the builder prompt.** Adding a new block type requires updating both the frontend renderer AND the agent's builder prompt. The user explicitly doesn't want this — the builder should discover available components.

3. **Can't match system app quality.** Built-in apps use the full design system: buttons, switches, sliders, menus, scroll-fade, floating inputs. Composed apps get a flat list of blocks. They look and feel like a different, worse product.

4. **No wiring between blocks.** A real app has state flow: toggling a checklist item updates a progress bar and a metric. Blocks have no concept of this — they're independent data blobs.

5. **Builder hits limits at scale.** Apps with 30+ blocks cause the model to hit output token limits, producing malformed tool calls (`KeyError: 'block'`). The block-per-tool-call pattern is too chatty for complex apps.

### Conclusion: blocks don't go far enough.

---

## The actual goal

Generated apps should be **indistinguishable from built-in system apps** in interaction richness. Specifically:

- Use the **same design components** that built-in apps use (Button, Switch, Slider, MenuCard, scroll-fade, etc.)
- Have **real interactivity** — toggles toggle, inputs input, actions trigger state changes
- Be operable by the agent via the **existing entity-as-MCP schema protocol** (`get_entity_schema` / `call_entity_tool`) — no special treatment
- Adding new design components should **automatically** make them available to the builder — no prompt updates

This means the builder needs to generate something closer to actual component trees with state + event wiring, not static data blocks. The exact representation (declarative component DSL, sandboxed React, interpreted UI tree) is the open design question for the next spike.

---

## Other findings

- **`asyncio.create_task` swallows exceptions.** Unhandled errors in fire-and-forget tasks are silently lost. Added a `_run_builder` wrapper in `build_app()` that catches and logs crashes.
- **`lucide-react/dynamic` doesn't exist in v0.564.0.** The `DynamicIcon` import path from the docs doesn't ship in this version. Use `icons` map from `lucide-react` directly with kebab→PascalCase conversion.
- **Builder retries on same entity.** The agent sometimes calls `build_app` multiple times on the same entity after failures, overwriting previous blocks. Needs idempotency or a lock.
