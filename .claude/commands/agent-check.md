Run health checks on the Domus space agent — the AI agent users interact with inside the product.

## Checks

1. **Context injection** — Verify the system prompt is assembled correctly: entity index scope, schema selection, personality traits, conversation turn window.
2. **Tool tests** — Run agent tool tests. Confirm all 5 tools (create_entity, update_entity, query_entities, read_entity, web_search) behave correctly.
3. **Schema caching** — Check that app schemas are fetched and cached properly. Verify stale cache doesn't persist.
4. **Context stack** — Trace a request through the full payload path (frontend → proxy → agent) and verify each field is consumed correctly.
5. **Evaluations** — Run eval scenarios if they exist. Check response quality against thresholds. Flag regressions.
6. **Complexity audit** — Surface growth signals: system prompt size, entity type count, block type count. Flag anything that could degrade agent performance.

## Rules

- Skip checks that depend on infrastructure not yet built — note what was skipped and why
- Report issues, don't auto-fix
- Compare against previous runs when available to catch regressions

$ARGUMENTS
