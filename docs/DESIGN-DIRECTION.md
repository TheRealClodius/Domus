# Domus — Design Direction

How Domus looks, feels, and communicates. This document governs every visual decision.

---

## How to Use This Document

This is the **design authority** — it defines what Domus should feel like, the constraints that govern every decision, and the principles that prevent drift toward generic SaaS aesthetics.

**This document defines:** Philosophy, emotional identity, non-negotiable constraints (P1–P12), interaction patterns, component intent, and a validation checklist.

**Source code defines:** Token values, exact dimensions, component implementations, animation parameters. Source is the single source of truth for all implementation details.

**The workflow:** Read this document for *intent and constraints*. Read canonical source files for *exact values*. If source contradicts this document on a design principle, this document wins — update the source. If this document duplicates an exact value that also exists in source, remove it from this document.

### Source Map

| Concern | Canonical Source |
|---|---|
| Color, spacing, typography, radius, shadow tokens | `tokens/tokens.css` |
| Form primitives (Button, Input, Select, Toggle, Checkbox) | `core/ui/` |
| Entity chrome (Window, Card, Sidebar panel) | `core/entity/` |
| Prompt bar & conversation panel | `core/chat/` |
| Canvas, viewport culling, pan/zoom | `core/canvas/` |
| Bottom sheet, context menu, App Dock | `core/layout/` |
| Animation config (spring parameters, duration tiers) | `lib/motion.ts` |
| App type definitions, entity model | `lib/types.ts` |

If a canonical source file doesn't exist yet, create it following the principles in this document. The first implementation becomes the canonical reference — subsequent work reads from it.

---

## Core Premise

Domus is an environment that responds to you. The design must make the agent's actions feel **spatial** (things appear, move, glow, fade) rather than **textual** (chat bubble, chat bubble, chat bubble). The UI is a room, not a feed.

The agent is not a chatbot that happens to have a canvas. The canvas IS the interface. Chat is one input surface among many.

---

## Design Lineage: OS1 → Domus

Domus is a rewrite of [OS1](https://github.com/TheRealClodius/OS1), the previous version of this project. OS1 established the core design identity — Domus inherits its visual language and evolves it into a more complete spatial system. Understanding what carries over and what changes prevents drift toward generic SaaS aesthetics.

### What We Inherit from OS1

**Warmth as identity.** Warm tonal surfaces as the core visual identity. Every UI element participates in a warm color system — depth comes from transparency and tonal shifts, not from competing colors. Warm hue tints on every surface, accent scarcity, and the feeling that the interface is a *place* rather than a *page*.

**The interface as environment.** The screen as a spatial surface, not a document. The canvas is a room you walk into, not a page you scroll through. Entities have positions, not rows.

**Agent presence as motion.** Visual indicators communicate agent activity and aliveness. The agent glow: a warm halo on entity borders that fades over seconds, communicating "the agent was just here" without a dedicated animation widget.

**Radical restraint.** Limited color, minimal chrome, opacity as the primary tool for hierarchy. One typeface, constrained sizes, accent color in exactly three places.

**Glassmorphism on overlays.** `backdrop-filter: blur()` with semi-transparent surfaces on overlay elements (prompt bar, conversation panel, context menus, bottom sheet) while flat tonal surfaces for multiplied entity elements.

### What We Evolve

| OS1 Approach | Domus Approach | Why |
|---|---|---|
| Monochrome-leaning palette | Semantic token system (tonal palettes from seed hues) | Multiple entity types and states — pure monochrome can't communicate enough. Tokens preserve warmth while adding semantic range. |
| Depth from transparency layers | Shadows for entities, blur for overlays | Spatial canvas with overlapping windows — shadows communicate stacking order. Overlay surfaces keep OS1's blur. |
| Single-surface interaction | Windowed spatial canvas (entities in draggable windows/cards) | Workspace with rich visual entities — needs the window metaphor. |
| Ultra-light typography | Functional typography | Dense information in windows — readability wins over aesthetics. |
| Pill-shaped / organic geometry | Soft rectangles (token-based radius scale) | Entities contain structured content. Rectangular containers are functional. Generous radius keeps it soft. Prompt bar retains pill shape. |

### The Emotional Test

When evaluating any Domus UI, apply this gut check:

1. **Does it feel warm?** — If it could be a Notion clone or a generic dashboard, it's too cold. The warm hue tint in surfaces should be perceptible.
2. **Does it feel quiet?** — If your eye is pulled in multiple directions by competing colors or chrome, it's too noisy. The agent glow should be the loudest thing on screen.
3. **Does it feel spatial?** — If it reads like a list or a page, it's too flat. Entities should feel like objects in a room.
4. **Does it feel alive?** — If nothing moves or glows, the agent feels absent. The glow and animations are how the agent's presence is *felt*, not just read.

---

## Core Design Patterns

Non-negotiable constraints. Every component, every screen, every UI element must conform. Check your work against each pattern.

### P1: Token-Only Color

Never use raw color values in components. Every `bg-`, `text-`, and `border-` class must reference a semantic token. No `bg-gray-100`. No `#d1684e`. No `rgb(...)` in component code.

If you need a color that doesn't have a token, extend the design system in `tokens.css` first. Don't work around it with a hardcoded value.

**Rationale:** The warmth of Domus is encoded in the token pipeline. Raw colors bypass the tonal system and break theme consistency.

### P2: Depth Through Elevation and Layering

Depth comes from two mechanisms: the shadow scale (`shadow-resting` → `shadow-elevated`) and the surface tone scale (`surface-sunken` < `surface` < `surface-raised`).

For **entity container surfaces** (windows, cards): flat tonal backgrounds with shadows. No gradients. No blur on the container itself. These are multiplied across the canvas — they must be cheap to render.

For **overlay surfaces** (prompt bar, conversation panel, context menus, bottom sheet, popovers): `backdrop-filter: blur()` with semi-transparent backgrounds. These are singleton elements that float above the entity layer.

**Clarification:** Transient overlays *within* entity windows (dropdowns, select panels, popovers) may use blur — they are singleton overlays, not entity container surfaces.

No borders stacked on borders to fake depth. No background images or noise textures.

### P3: The Agent Glow Is Sacred

The warm glow on entity borders is the single most important visual signal in Domus. It means *"the agent just did something here."* No other UI element may use a similar glow effect.

Don't add glows to buttons, inputs, hover states, or decorative elements. The glow is reserved exclusively for agent-origin entity changes.

**Rule:** If `created_by === 'agent'` and the entity was touched recently → glow. Otherwise → no glow. No exceptions.

→ *Glow implementation: entity chrome components in `core/entity/`*

### P4: Three Sizes, Two Weights, One Typeface

UI chrome uses exactly three font sizes, two weights, one typeface (system font stack). The three sizes serve distinct roles:

| Token | Use |
|---|---|
| `text-body` | Everything — default for all UI chrome |
| `text-label` | Metadata, timestamps, entity type badges |
| `text-title` | Window titles, section headers |

Rendered content inside entities (markdown, rich text) uses an extended content typography scale for headings, code, blockquotes, and lists. These extended sizes only exist inside entity content areas, never in chrome.

No bold body text. No italic for emphasis. No custom web fonts. If your chrome element needs a font size outside the three-size table, the design is wrong — restructure it.

→ *Token values: `tokens/tokens.css`. Content typography: entity content components.*

### P5: Spacing Is a Multiple of 4

Every margin, padding, and gap is a multiple of 4px. Use the token scale defined in `tokens.css`. Don't eyeball spacing — use the tokens.

Spacing between elements encodes the relationship between them. Three relational levels:

- **Tight coupling** — heading → paragraph, icon → label
- **Sibling elements** — paragraph → paragraph, list items, form fields
- **Content → action** — body text → CTA button, description → action bar

→ *Spacing scale and relational gap tokens: `tokens/tokens.css`*

### P6: Agent Animates, User Is Immediate

When the agent creates, moves, or updates an entity: animate with spring physics. When the user drags, resizes, types, or clicks: zero transition delay, instant response.

This asymmetry is how the user subconsciously distinguishes "I did that" from "the agent did that." It's communicative, not cosmetic.

Three duration tiers: fast (micro-interactions), medium (component transitions), slow (entity creation/archival). Plus the agent glow fade, which is deliberately slow because it's ambient.

→ *Spring parameters and duration values: `lib/motion.ts`*

### P7: Accent Scarcity

The `primary` color appears in exactly three contexts:

1. Focused entity borders
2. Interactive element hover states
3. The agent glow

**Exception:** Focus rings on interactive elements use `primary` at low opacity for accessibility. These are low-intensity indicators, not decorative accents — they don't compete with the agent glow.

Beyond this, `primary` needs explicit justification. Color scarcity is what makes the agent's actions visible. If everything is colorful, nothing stands out.

### P8: No Chrome Sprawl

The total icon budget:

- App icons in entity headers (one per window)
- App icons in the App Dock (one per app type)
- Window controls: close, minimize, maximize (top-left, macOS style)
- Chat send button
- Context menu item icons (where semantically useful)

That's it. No icon-heavy toolbars. No floating action buttons. Every icon added dilutes the spatial interface.

### P9: Flat Surfaces, Real Shadows

Entity surfaces are flat solid colors from the tonal palette. Shadows are the sole elevation indicator for entities. Radius is soft on everything, but nothing is circular except avatars.

Overlay surfaces use glassmorphism (semi-transparent + blur). This visually separates the spatial entity layer from the floating chrome layer.

No gradients. No noise textures. No background images.

### P10: Entities, Not Pages

There are no "pages" in Domus. Everything is an entity rendered at a position on a spatial canvas. If you're building something that feels like a full-page layout — you're building the wrong thing. Build an entity type that renders inside a window, card, or sidebar panel.

### P11: Respect User Preferences

Honor `prefers-reduced-motion` (all animations → instant, glow → static border highlight), `prefers-color-scheme` (automatic theme switching), and system font size settings. Domus lives inside the user's OS — it doesn't fight the environment.

### P12: Inline Feedback, No Interruptions

Errors, confirmations, and status updates appear inline — inside the chat flow as chips, inside entity chrome as state changes, or as the agent glow. Never use toast notifications, snackbars, or banners. Modals are acceptable only for destructive action confirmations.

Entities loading async content use warm shimmer placeholders — not heavy skeleton screens that mimic final layout.

If the agent fails, it says so in chat. If it succeeds, the entity glows. The spatial interface is the feedback mechanism.

---

## Design System Concepts

The design system is implemented in `tokens.css` and the component library. This section explains the *thinking* behind the system — the intent that should guide implementation and extension.

### Tonal Logic

We adopt Material Design 3's **relational color system** — not its components, not its specific palettes, but its core insight: colors are generated from relationships, not picked from swatches.

1. **Seed hues** — Two brand hues define the identity. A primary (warm) and a secondary (cool). These are the only hand-picked values.

2. **Tonal palettes** — From each seed, generate a multi-step tonal palette in oklch. Light theme pulls from the light end. Dark theme pulls from the dark end. Same hues, different tones.

3. **Semantic roles** — Every surface, text, and border maps to a role:

| Role | What it means |
|---|---|
| `surface` | Default background |
| `surface-raised` | Cards, windows — elevated above default |
| `surface-sunken` | Inset areas, wells — recessed below default |
| `on-surface` | Primary text on any surface |
| `on-surface-muted` | Secondary text, metadata |
| `outline` | Borders, dividers |
| `primary` | Brand accent, interactive elements |
| `on-primary` | Text on primary-colored backgrounds |
| `agent` | Agent-origin indicator (the glow) |
| `error` | Error states |

Roles map to different tonal values in light vs. dark themes, but the semantic meaning is constant.

4. **No raw colors in components.** Every `bg-`, `text-`, `border-` class references a semantic token. If you write `bg-orange-500` in a component, you're doing it wrong. Write `bg-agent` or `bg-primary`.

→ *Token definitions, theme values, and Tailwind v4 integration: `tokens/tokens.css`*

### Typography Principles

One typeface (system font stack). Two weights. Three sizes for chrome. An extended scale for rendered content inside entities.

The system font is the right font — Domus is a tool, not a marketing site. Monospace content uses the system monospace stack.

Line-height is consistent across all sizes for comfortable readability.

→ *Type scale values: `tokens/tokens.css`. Content typography styles: entity content components.*

### Spacing Principles

4px base unit. Everything is a multiple of 4. Spacing is semantic — the gap between two elements reflects their relationship (tightly coupled, siblings, or separated by intent).

Container internal padding is consistent and defined by token. No magic numbers.

→ *Spacing scale and relational gap tokens: `tokens/tokens.css`*

### Radius Principles

Domus is soft but not bubbly. Three tiers: small (buttons, inputs, chips), medium (cards, dropdowns), large (windows, bottom sheets). Nothing is circular except avatars.

**Concentric radius rule:** Inner elements derive their radius from the parent to maintain visual concentricity. `child-radius = parent-radius - parent-padding`. If the result is ≤ 0, no radius.

→ *Radius values: `tokens/tokens.css`*

### Shadow & Elevation

Two shadow levels: resting (cards at rest, default) and elevated (focused windows, sheets, popovers). Shadows are the sole depth cue for entities. Dark theme shadows are stronger to maintain perceptibility.

→ *Shadow values: `tokens/tokens.css`*

---

## Visual Feedback Vocabulary

The agent acts on the world. The user must see those actions *spatially*, not just read about them in chat. Every agent action has a visual consequence.

### Entity States

| State | Visual Treatment |
|---|---|
| **Agent-creating** | Scales up from origin point, flies to resting position. Agent glow on border. Spring easing, crisp settle. |
| **Agent-updating** | Brief pulse on the changed region — a highlight sweep across the updated content area. |
| **Agent-moving** | Smooth spring position transition. The entity glides, not teleports. |
| **User-dragging** | No transition. Direct 1:1 pointer tracking. Slight shadow elevation increase. |
| **Focused** | Elevated shadow. Title bar at full opacity. |
| **Unfocused** | Resting shadow. Title bar dims. Content stays readable. |
| **Archiving** | Scale-down toward origin point, opacity fades. Reverses the creation animation. |

→ *Animation implementations: `lib/motion.ts` and entity chrome components.*

### The Agent Glow

When the agent creates or significantly updates an entity, it gets a **warm glow** — a soft colored shadow that fades over seconds. This is the single most important visual signal in Domus. It answers: "what did the agent just do?"

- Appears instantly on agent action
- Fades to normal shadow gradually
- Only on entity chrome (window/card border), not on content
- Color comes from the `agent` token — warm, not neon

→ *Glow CSS and timing: `core/entity/` chrome components.*

### Canvas Indicators

| Indicator | What it communicates |
|---|---|
| **Agent activity pulse** | Agent is processing. Subtle radial pulse from the chat area — concentric rings at very low opacity, expanding outward. Sonar ping. |
| **Entity connection lines** | Two entities are related. Thin dashed lines shown on hover of either entity or when the agent references the relationship. Uses `outline` token. |
| **Drop zone** | Entity being dragged near a rearrangement target. Faint highlight rectangle. Free placement, no snapping. |

### Chat Indicators

The chat panel is the secondary interface. It confirms what the spatial UI shows, it doesn't replace it.

| Indicator | Visual |
|---|---|
| **Agent thinking** | Animated ellipsis. Text appears in chunks as it streams. |
| **Tool call in progress** | Inline chip with shimmer: `[creating note...]` |
| **Tool call complete** | Chip resolves to entity name as clickable link → focuses entity on canvas. |
| **Error** | Error-tinted chip inline in conversation. No modal. No toast. |
| **Model indicator** | Tiny muted label below agent messages. Only shown if multi-model is enabled. |

### Entity Transitive States

Entities are not always settled. They load data, get created, get archived.

| State | When | Visual Treatment |
|---|---|---|
| **Loading** | Content being fetched/generated | Entity chrome renders immediately. Content area shows a warm shimmer — abstract placeholder blocks, not a structural skeleton. Agent glow active if agent-created. |
| **Creating** | Tool call in flight, entity not yet persisted | Chat chip shows shimmer. Entity appears on canvas only when persisted. |
| **Archiving** | Being removed | Scale-down + fade animation. Spring easing. |
| **Error** | Failed to load or action failed | Content area shows centered muted error text with accent left border. Inline, not modal. |

**Loading shimmer is not a skeleton screen.** It doesn't mimic the exact layout of final content. It's a minimal, warm indicator — a few abstract rounded-rectangle blocks on a sunken background. When content arrives, cross-fade to real content.

### Empty States

Every entity that can contain dynamic content must define an empty state.

- **Empty canvas:** Centered muted text — "Talk to the agent or open an app from the dock." No illustrations. No onboarding wizard.
- **Empty entity:** Centered muted text following the pattern "[action verb] to get started." No decorative graphics.
- **No search results:** "No results for [query]."

---

## Component Patterns

These describe the *intent and structure* of core components. Exact dimensions, padding, and styling live in the canonical component implementations.

### Windows

```
┌─────────────────────────────────────┐  ← rounded, elevated shadow (focused)
│  ● ● ●  Title                   ◉   │  ← title bar (controls left, icon right)
├─────────────────────────────────────┤  ← divider
│                                     │
│   [App content, padded]             │  ← bg-surface-raised
│                                     │
└─────────────────────────────────────┘
```

- Title bar: window controls on **left** (close, minimize, maximize — macOS style), title text, app icon on right.
- Close = hide (`presentation: 'hidden'`). Entity persists, agent can reopen it. This is like minimizing to a dock — not deletion.
- Minimize = collapse to title bar only.
- Maximize = expand to fill canvas (not OS fullscreen).
- Focus: elevated shadow + full-opacity title bar. Unfocused: resting shadow + dimmed title bar.
- Drag: entire title bar is the handle.
- Resize: corner and edge handles.
- No tabs. No nested navigation. One entity = one window = one view.

→ *Implementation: `core/entity/`*

### Cards

Cards are compact entity previews on the canvas. Portrait proportion. Two variants.

**Image Card:**

```
┌───────────────────────┐
│                       │
│  [Image, edge-to-edge]│  ← no padding, fills to rounded corners
│                       │
│                       │
│  type · timestamp     │  ← metadata row
└───────────────────────┘
```

**Text Card:**

```
┌───────────────────────┐
│  Title                │
│                       │
│  Summary text that    │  ← truncated preview of full content
│  previews the doc...  │
│                       │
│  type · timestamp     │  ← metadata row
└───────────────────────┘
```

**Hover:** Gradient scrim overlay with action icons (maximize, add to context, share).

- Image card: image fills edge-to-edge, clipped by overflow hidden + border radius.
- Text card: padded content zone with title + summary (truncated to card height). The summary previews what the user sees in the full sheet/window.
- Both variants: metadata row at bottom (type + timestamp).
- Click: opens full content — expands to window or bottom sheet.
- Drag: entire card is the handle.
- Fixed size per card type, defined in app type definitions.

→ *Implementation: `core/entity/`*

### App Dock

The App Dock is where the space's apps are stacked and accessible. Left-aligned, vertical.

- Can fully hide — not just collapse to icons. The Canvas reclaims the space when the dock is hidden.
- App launcher: vertical stack of app types (icon + name). Click creates a new entity at viewport center with standard creation animation.
- Docked panels: entities with `presentation: 'sidebar'` render below the launcher. Vertically stacked, scrollable, collapsible to title row.
- Bottom section: space name, user avatar, settings.

Both the user (via App Dock) and the agent (via `create_entity`) can create entities. The dock is the user's direct creation path; the agent is the conversational path.

→ *Implementation: `core/layout/`*

### Prompt Bar & Conversation Panel

The agent chat is a bottom-center prompt bar with a conversation panel that pops up on demand. NOT a sidebar or fixed dock.

**Prompt bar** (always visible):

- Fixed bottom-center, above all entities.
- Resting: compact, pill-shaped input with placeholder. Glassmorphic background.
- Active: widens, context and send buttons appear. Spring animation.
- Expanded: grows vertically for multi-line input. Internal scroll past max lines.
- Send: Enter to send, Shift+Enter for newline.

**Conversation panel** (on demand):

- Triggered by sending a message. Chat bubble appears above prompt bar.
- Expanding the bubble reveals the full conversation. Glassmorphic, springs upward.
- Dismiss: minimize button, or click outside.
- Auto-minimizes when entity windows overlap the prompt bar area.
- Hidden entirely when any entity window is maximized.

**Chat content:**

- Minimal chrome. User messages right-aligned, agent left-aligned. No avatars. Timestamps on hover.
- Tool call chips inline with message flow.
- Scrolls to bottom on new messages.

→ *Implementation: `core/chat/`*

### Bottom Sheet

Full-width overlay sliding up from the bottom. For focused content or document-length viewing.

```
┌─────────────────────────────────────────────────┐
│                                                 │  ← top inset (canvas visible,
│   ┌─────────────────────────────────────────┐   │     scaled down + dimmed)
│   │ [scaled-down canvas behind]             │   │
│   └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Title                                     ✕    │  ← header + close
├─────────────────────────────────────────────────┤
│                                                 │
│  [Sheet content]                                │  ← bg-surface-raised
│                                                 │
└─────────────────────────────────────────────────┘
```

- Canvas behind scales down slightly and dims — maintains spatial orientation. iOS-style depth.
- Dismiss: close button or click visible canvas above.
- Spring animation from bottom edge. Top-corner radius only.
- Full viewport width. No side margins.

→ *Implementation: `core/layout/`*

### Context Menu

Right-click on an entity:

- **Archive** — plays archive animation
- **Change presentation** → submenu: Window, Card, Sidebar
- **Duplicate** — copy at offset position
- **Add to agent context** — pins for next agent message

Glassmorphic overlay surface. Appears at cursor, constrained to viewport. Spring open, fade close.

No canvas context menu. Right-clicking empty canvas does nothing. All entity creation flows through the App Dock or agent.

→ *Implementation: `core/layout/`*

---

## Canvas Behavior

The Canvas is the space's visual container — a full-viewport inset card with slight padding from all four browser edges and rounded corners, filled with `surface-sunken`. The browser background behind it uses `surface`, creating a tonal frame that communicates "you've entered a space." The inset and radius make the space feel like a contained environment, not a webpage edge-to-edge.

Within the Canvas, the spatial surface is infinite — pannable and zoomable. Entities live at absolute positions.

### Pan & Zoom

- Infinite pan + zoom. No boundaries.
- Pan: click-drag on empty space, or middle-mouse anywhere.
- Zoom: scroll wheel or pinch toward cursor position.
- Zoom range: 25%–200%, default 100%.
- Zoom-to-fit: keyboard shortcut that frames all entities with comfortable padding.

### Agent Placement

The agent places entities in loose clusters near the origin, checking for collisions to avoid overlap. The workspace stays compact and navigable — no random scatter across infinite space.

### Viewport Culling

Only entities within the visible viewport (plus a margin buffer) are rendered. Off-screen entities are unmounted. Essential for performance at scale.

### Background

The browser viewport fills with `surface`. The Canvas card (inset, rounded) sits on top in `surface-sunken`. Inside the Canvas, an optional subtle dot grid at very low opacity provides spatial orientation during panning. Toggleable in settings.

### Entry Choreography

The app loads in layers — choreographed and hierarchical, not all at once. Each surface appears in sequence with deliberate timing:

1. **Background** — `surface` viewport fill, instant.
2. **Canvas** — fades in with a subtle scale-up (from ~98% to 100%). The inset card emerges as if the space is opening.
3. **App Dock + Prompt Bar** — fade in together, anchoring the interface chrome.
4. **Entities** — cards and windows appear as their data is ready. Each uses the standard spawn animation (scale-up from origin, spring settle, agent glow if agent-created).

If entity content isn't ready, the entity chrome appears immediately with a warm shimmer in the content area, then cross-fades to the loaded state. No pop-in, no layout shift.

`prefers-reduced-motion`: all layers appear instantly with no scale or fade. Sequence is preserved (background → canvas → chrome → entities) but transitions are zero duration.

→ *Canvas implementation: `core/canvas/`*

---

## Entity Sizing & Overlap

### Size Constraints

| Presentation | Resizable | Notes |
|---|---|---|
| Window | Yes (corner + edge handles) | Min dimensions enforced. No max. Default size per app type. |
| Card | No | Fixed size per app type. |
| Sidebar | No (width locked, height auto) | Width matches App Dock. Height from content. |

### Stacking

Entities overlap freely like desktop windows. Z-index determines order:

| Layer | Elements |
|---|---|
| Canvas surface | `surface-sunken` inset card, optional dot grid |
| App Dock | App launcher, docked panels — reserves or overlays canvas space |
| Entities | Windows, cards — focus brings to top |
| Overlay surfaces | Context menus, dropdowns, popovers |
| Prompt bar | Prompt bar + conversation panel |
| Bottom sheet | Sheet + scrim |

Focus = top. Agent-created entities spawn at the top. Dragging over another entity doesn't push it — free spatial placement.

### Scrolling Inside Entities

- Content overflows vertically with OS-native scrollbars.
- No horizontal scroll unless content demands it (code, wide tables).
- Programmatic scrolls (chat auto-scroll) use smooth behavior.
- The canvas itself pans — no browser scrollbars.

---

## Form Primitives

All apps compose from shared form primitives. The agent uses these same primitives when building new app UIs. Never use raw HTML form elements.

**Available primitives:** Input, Textarea, Select, Toggle, Checkbox, Button (primary / ghost / danger variants).

One button height. All inputs share consistent height. See the component implementations for exact dimensions and state behavior.

→ *Implementation: `core/ui/`*

---

## Interactive States

Four universal rules govern every interactive element:

| State | Visual Treatment |
|---|---|
| **Hover** | Surface lightens one tonal step |
| **Focus** | Ring using `primary` at low opacity. Replaces browser default. |
| **Active / Pressed** | Surface darkens one tonal step |
| **Disabled** | Reduced opacity, no pointer events |

These rules apply consistently across all components. Per-component state implementations live in the component source.

→ *Component implementations: `src/components/ui/`*

---

## Image Fill Behavior

- **Cards:** Images go edge-to-edge, clipped by overflow hidden + border radius. No padding.
- **Windows:** Content images respect standard content padding. Exception: full-bleed backgrounds fill edge-to-edge.
- **Grids:** Image grids use tight gaps (mosaic feel). Content tile grids use wider gaps (breathing room).

---

## Motion Principles

### 1. Agent Animates, User Is Immediate

Agent creates a window → springs into existence. User drags a window → tracks the pointer instantly.

### 2. Everything Comes From Somewhere

Every element has a spatial origin. No elements materialize from nowhere.

- A bottom sheet slides up from the bottom edge.
- A window scales up from the icon or button that spawned it.
- A context menu expands from the click point.
- A card action overlay fades in from the card surface.

If there's no spatial trigger (keyboard shortcut), the entity grows from a seed shape at viewport center.

### 3. Spawn Animation

New entities start scaled-down at their origin point, then scale up and fly to resting position. iOS app-launch pattern adapted for a spatial canvas. Archival reverses it.

### 4. Spring Physics

All animations use spring easing. Crisp settle with minimal overshoot — professional, not playful. Closer to the Linear/Vercel motion feel than iOS bounce.

### 5. Duration Tiers

Three tiers: fast (hover/press feedback), medium (component transitions), slow (entity creation/archival). Exception: agent glow fade is deliberately slow because it's ambient.

### 6. Reduce Motion

Respect `prefers-reduced-motion`. All animations → instant. Glow → static border highlight. Spatial origin principles still apply conceptually.

### 7. Presentation Morphs

When an entity changes presentation mode (card → window, etc.), it morphs between states:

1. Capture current bounding rect.
2. Calculate target bounding rect from new presentation.
3. Animate between them with spring physics.
4. Chrome elements cross-fade during the morph.
5. Content scales and clips within the morphing container.
6. `prefers-reduced-motion`: instant swap.

→ *Spring parameters, duration values, and animation utilities: `lib/motion.ts`*

---

## Color Philosophy

Domus is **warm and quiet**. Not sterile-white productivity tool. Not neon-dark hacker aesthetic.

- **Theme:** Follows `prefers-color-scheme`. User can override.
- **Light:** Warm off-white (primary hue tint). High contrast text. The feel of good paper.
- **Dark:** Deep warm gray, not pure black. Primary hue tint. The feel of a well-lit room at night.
- **Accent scarcity:** `primary` on focused borders, interactive hover states, and the agent glow. That's it.
- **Spatial depth:** Canvas is `surface-sunken`. Entities are `surface-raised`. Overlays use glassmorphism.

---

## Anti-Patterns

Things we will not do:

- **Gradients on surfaces.** Flat tonal backgrounds with shadow.
- **Blur on entity container surfaces.** Flat for entities. Blur for overlays only. Transient child overlays within entities (dropdowns, popovers) may use blur.
- **Icon-heavy navigation.** See P8 icon budget.
- **Toast notifications.** Spatial + inline feedback only.
- **Heavy skeleton screens.** Warm shimmer, not layout-mimicking skeletons.
- **Confetti, particles, celebratory animations.** This is a workspace.
- **Custom scrollbars.** OS default.
- **Pages or full-screen layouts.** Entities on a spatial canvas.
- **Raw HTML form elements.** Use Domus form primitives.

---

## Agent Guardrails Checklist

Run through this before considering any component complete. **Verify exact values against the canonical source files, not this document.**

### Before Writing Any Component

- [ ] Read the entity model. Your component renders inside a window, card, or sidebar panel. It doesn't own layout, chrome, or positioning.
- [ ] Identify the presentation type — each has different chrome, sizing, and interaction rules.
- [ ] Check if an existing app covers this. Don't create a new entity type if an existing one can be extended.

### Color

- [ ] Every `bg-`, `text-`, `border-` uses semantic tokens. No raw colors.
- [ ] `primary` only used for: focused borders, hover states, agent glow (+ focus rings for accessibility).

### Typography

- [ ] Chrome uses only the three token sizes with correct weights.
- [ ] Content areas may use the extended scale from entity content components.
- [ ] System font stack only. No custom fonts.

### Spacing

- [ ] All values are multiples of 4px, using token scale from `tokens/tokens.css`.
- [ ] No magic numbers for margins or padding.
- [ ] Relational gaps reflect element relationships (tight, normal, loose).

### Elevation

- [ ] Correct shadow level (resting vs elevated) per component type.
- [ ] No blur on entity container surfaces. Blur only on overlay surfaces.
- [ ] No gradients.
- [ ] Radius uses token scale. Inner radius maintains concentricity.

### Motion

- [ ] Agent changes animate with springs. User changes are instant.
- [ ] Duration matches the appropriate tier from `lib/motion.ts`.
- [ ] New elements have a spatial origin.
- [ ] `prefers-reduced-motion` respected.

### Form Primitives

- [ ] All inputs use Domus primitives from `core/ui/`. No raw HTML elements.
- [ ] Buttons use one of three variants (primary, ghost, danger).
- [ ] All interactive elements implement hover, focus, active, disabled states.

### Transitive States

- [ ] Loading state defined (shimmer, not skeleton).
- [ ] Empty state defined (centered muted text, no illustrations).
- [ ] Errors are inline, not modal/toast.

### Feedback

- [ ] No toasts, snackbars, or floating banners.
- [ ] Agent glow used only for agent-origin changes.

### Chrome

- [ ] No icons beyond the P8 budget.
- [ ] No toolbars or nested navigation within windows.
- [ ] One entity = one window = one view.

### Accessibility

- [ ] `prefers-reduced-motion` handled.
- [ ] `prefers-color-scheme` respected via tokens.
- [ ] Visible focus states on all interactive elements.
- [ ] Text contrast meets WCAG AA.
