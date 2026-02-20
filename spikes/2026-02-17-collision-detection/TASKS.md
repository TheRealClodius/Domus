# Spike Tasks: Multiple Folders + Folder Renaming

## Multiple Folders

Infrastructure already supports multiple folders — folders are entities with `presentation: 'folder'`, each with a unique UUID and independent `child_ids` array. No code changes needed for basic coexistence.

### Tasks

- [ ] **Verify multi-folder coexistence** — Select 2+ cards not in any folder, click Gather, confirm a second folder is created with its own `child_ids`. Existing folder is untouched.
- [ ] **Visual distinction between folders** — Currently all folders look identical (same thumbnail stack, same label style). Decide if folders need any differentiation (e.g. summary text, color hint) or if spatial position alone is sufficient.
- [ ] **Cross-folder operations** — What happens when you select cards from two different folders and gather? Current `gatherEntities` creates a new folder from the selection — it doesn't know the cards are already in other folders. Need to eject from source folders first, or merge.
- [ ] **Scatter with multiple folders** — `scatterFolder` operates on one folder. Verify scattering folder A doesn't affect folder B's children or position.

## Folder Renaming

Currently `summary` is auto-set to `"N items"` on create (`entityStore.ts:393`) and updated on eject (`entityStore.ts:512`). No user-editable UI exists.

### What exists

- `FolderStack` accepts a `label` prop and renders it below the thumbnail stack
- `SheetFolderContent` displays `folder.summary || 'Folder'` as the sheet header
- `entityStore.upsert` can update `summary` on any entity

### Tasks

- [ ] **Inline-editable title in SheetFolderContent** — Replace the static `<h2>` header with an editable text field. Click to edit, Enter/blur to commit. Call `upsert({ id: folderId, summary: newName })`.
- [ ] **Preserve user-set name on eject** — `ejectFromFolder` currently recomputes `summary` as `"N items"` after removing a child. If the user renamed the folder, the name gets overwritten. Check `summary` before overwriting — only auto-update if it matches the `"N items"` pattern.
- [ ] **FolderStack label from summary** — `SpaceRenderer` passes `label={entity.summary}` to `FolderStack`. Verify this already works or wire it up.
- [ ] **Empty name handling** — If user clears the name, fall back to `"N items"` auto-naming.
