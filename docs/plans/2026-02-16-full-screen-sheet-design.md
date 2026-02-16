# Full-Screen Sheet — Design

## Goal

A reusable full-screen bottom sheet container used across the app: entity maximization (first use), login page, image viewing. The sheet also introduces a Tiptap-based rich text editor for document editing with agent streaming support.

## Architecture

Layered composition. The sheet is a pure container (animation, header, dismiss). Content components (editor, login form, image viewer) drop into the sheet body. The sheet imports nothing about its children.

```
<FullScreenSheet>
  <SheetHeader actions={<>...</>} />
  <SheetBody>
    <RichEditor entity={...} />   ← or <LoginForm /> or <ImageViewer />
  </SheetBody>
</FullScreenSheet>
```

## Sheet Container

**Files:** `core/sheet/FullScreenSheet.tsx`, `SheetHeader.tsx`, `SheetBody.tsx`, `SheetBackdrop.tsx`

**Behavior:**
- Renders via portal at top of React tree — z-index above everything (canvas, dock, prompt bar)
- Slides up from bottom edge using `motion/react` with `gentle` spring from `lib/motion.ts`
- Full viewport width, no side margins
- Top corners: `radius-2xl` (20px), bottom corners: square (flush with viewport bottom)
- Background: `bg-surface-raised`, shadow: `shadow-overlay`
- Body scrolls independently with edge-fade masking (CSS `mask-image`)

**Dismiss:** Close button in header, click canvas backdrop, Escape key.

**Reduced motion:** Skip scale transform on canvas, simple opacity fade for backdrop.

## Canvas Backdrop

When sheet opens, canvas transforms to maintain spatial context (DESIGN-DIRECTION "Sheet Depth" principle).

- Canvas scales to `scale(0.96)` with `transform-origin: top center`
- Dims with `bg-black/40` overlay
- Both transitions sync with sheet slide-up spring
- Clicking dimmed canvas dismisses sheet
- Canvas content gets `pointer-events: none` (fully locked)

## Sheet Header

**File:** `core/sheet/SheetHeader.tsx`

```
[ Close (×) ]                    [ Action ] [ Action ] [ Action ]
  left-aligned                              right-aligned
```

- Close button always present, left side, uses `WindowControl` component
- Actions: right-aligned, passed as `React.ReactNode`, apps provide `<Button>` instances
- Height: `h-12` (48px), padding `px-5`
- Border: `border-b border-outline-subtle`
- Background: inherits `bg-surface-raised`
- No title prop — title is body content, not header chrome

## State Management

**File:** `core/sheetStore.ts` (new Zustand store)

```ts
{
  isOpen: boolean
  entityId: string | null
  contentType: 'entity' | 'login' | 'image'
  agentStreaming: boolean
  agentCursorPosition: number | null
  open(entityId: string | null, type: ContentType): void
  close(): void
  pauseStreaming(): void
  resumeStreaming(): void
}
```

Only one sheet at a time. `open()` replaces any existing sheet.

## Rich Text Editor

**File:** `core/editor/RichEditor.tsx`

**Dependencies:**
- `@tiptap/react` + `@tiptap/pm`
- `@tiptap/starter-kit` (paragraphs, headings, bold/italic, lists, blockquotes, code blocks, horizontal rules)
- `@tiptap/extension-image`
- `@tiptap/extension-placeholder`
- `mermaid` (diagram rendering)

**Custom Tiptap extensions:**
- `MermaidBlock` (`core/editor/extensions/MermaidBlock.tsx`) — custom node, accepts Mermaid source, renders SVG. User sees rendered diagram by default; toggle to view/edit source.
- `AgentCursor` (`core/editor/extensions/AgentCursor.tsx`) — decoration showing where agent is writing. Pill-shaped vertical bar (thick, 100% corner radii) in accent color with agent glow.

**Editor modes:**
- **User editing:** Standard Tiptap. Markdown shortcuts (`#` heading, `**` bold). No toolbar in v1.
- **Agent streaming:** Tokens insert at agent cursor via `editor.commands.insertContentAt()`. Tokens fade in. User can scroll/read while agent streams. User clicking to edit pauses streaming; removing focus resumes it.

**Entity integration:**
- Takes `entity: Entity` prop
- Loads `entity.content` as Tiptap JSON (empty string = empty doc)
- Debounced save to entity store via `entityStore.updateContent(id, json)`

## Agent Streaming

1. Agent streams tokens via existing connection
2. `sheetStore` tracks `agentStreaming` and `agentCursorPosition`
3. `RichEditor` shows agent cursor decoration when streaming
4. Tokens insert at cursor with fade-in animation
5. User click pauses streaming, focus-out resumes

**Agent cursor visual:** Thick vertical bar with 100% corner radii, `--accent` color, soft agent glow, pulses while receiving tokens.

## Dependency Additions

| Package | Purpose |
|---------|---------|
| `@tiptap/pm` | ProseMirror core |
| `@tiptap/starter-kit` | Base editing extensions |
| `@tiptap/extension-image` | Image nodes |
| `@tiptap/extension-placeholder` | Empty state hints |
| `mermaid` | Diagram rendering |

Note: `@tiptap/react` is already in ARCHITECTURE.md.

## Doc Updates Required

- **ARCHITECTURE.md:** Add `mermaid` to frontend dependencies, add sheet as a surface layer concept
- **DESIGN-DIRECTION.md:** Update bottom sheet section with finalized spec (dismiss methods, header structure, backdrop behavior)
- **TASKS.md:** Add future scope items

## Use Cases

| Use case | `contentType` | `entityId` | Header actions |
|----------|--------------|------------|----------------|
| Card maximize | `'entity'` | entity ID | App-specific (edit, share, etc.) |
| Login page | `'login'` | `null` | None (close only) |
| Image view | `'image'` | entity ID | Download, copy (TODO: editing later) |
