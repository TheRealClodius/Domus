# Domus — Design Direction

How Domus looks, feels, and communicates. This document governs every visual decision.

---

## Core Premise

Domus is an environment that responds to you. The design must make the agent's actions feel **spatial** (things appear, move, glow, fade) rather than **textual** (chat bubble, chat bubble, chat bubble). The UI is a room, not a feed.

The agent is not a chatbot that happens to have a canvas. The canvas IS the interface. Chat is one input surface among many.

---

## Design Lineage: OS1 → Domus

Domus descends from the OS1 interface in Spike Jonze's *Her* (2013), designed by Geoff McFetridge. Understanding that lineage explains why Domus looks the way it does and prevents well-intentioned agents from drifting toward generic SaaS aesthetics.

### What We Inherit from OS1

**Warmth as identity.** OS1's defining move was a single warm terracotta background (`#d1684e`) filling the entire viewport. Every UI element was white at varying opacities — depth came from transparency, not from a palette of distinct colors. Domus inherits this emotional register: warm hue tints on every surface, accent scarcity, and the feeling that the interface is a *place* rather than a *page*.

**The interface as environment.** McFetridge described wanting "evidence of the hand" — the interface should feel human-crafted, not machine-generated. OS1 treated the monitor as a frame and the interface within it as something closer to art than software. In Domus, the canvas is a room you walk into, not a document you scroll through. Entities have positions, not rows.

**Agent presence as motion.** OS1's signature was its 3D infinity knot — a continuously rotating form that spun faster when the AI was speaking. The knot didn't convey information; it conveyed *aliveness*. Domus translates this into the agent glow: a warm halo on entity borders that fades over seconds, communicating "the agent was just here" without a dedicated animation widget.

**Radical restraint.** OS1 used one background color, one foreground color (white), and opacity as its only tool for visual hierarchy. No icons to speak of. No navigation chrome. McFetridge resisted every push toward conventional UI patterns. Domus follows this restraint: one typeface, three sizes, two weights, accent color in exactly three places.

### What We Evolve

| OS1 Approach | Domus Approach | Why |
|---|---|---|
| Monochrome (one color + white at opacities) | Semantic token system (tonal palettes from seed hues) | Domus has multiple entity types and states — pure monochrome can't communicate enough. Tokens preserve warmth while adding semantic range. |
| Depth from transparency layers (`rgba(255,255,255,0.08)` to `0.2`) | Depth from elevation shadows (`shadow-resting` → `shadow-elevated`) | Transparency layering requires a single background color. Domus has a spatial canvas with overlapping windows — shadows communicate stacking order more clearly. |
| Full-viewport immersion (no chrome, no windows) | Windowed spatial canvas (entities in draggable windows/cards) | OS1 was voice-first with minimal visual content. Domus is a workspace with rich visual entities — it needs the window metaphor to manage spatial complexity. |
| Glassmorphism (`backdrop-filter: blur`) | Flat surfaces with tonal differentiation | Blur is a performance tax, especially with many overlapping entities on a canvas. Flat tonal surfaces achieve the same "layered" feel without the GPU cost. |
| Ultra-light typography (weight 200-300) | Functional typography (weight 400-600) | OS1's featherweight type was beautiful for a single-purpose voice interface. Domus has dense information in windows — readability wins over aesthetics. |
| Circular/organic geometry (pill shapes, the knot) | Soft rectangles (6-16px radius scale) | Entities contain structured content (notes, calendars, code). Rectangular containers are functional. Generous radius keeps it soft without fighting the content. |

### The Emotional Test

When evaluating any new Domus UI, apply this gut check borrowed from OS1's design philosophy:

1. **Does it feel warm?** — If it could be a Notion clone or a generic dashboard, it's too cold. The warm hue tint in surfaces should be perceptible.
2. **Does it feel quiet?** — If your eye is pulled in multiple directions by competing colors or chrome, it's too noisy. The agent glow should be the loudest thing on screen.
3. **Does it feel spatial?** — If it reads like a list or a page, it's too flat. Entities should feel like objects in a room.
4. **Does it feel alive?** — If nothing moves or glows, the agent feels absent. The glow and animations are how the agent's presence is *felt*, not just read.

---

## Core Design Patterns

These patterns are non-negotiable constraints. Every component, every screen, every UI element must conform. If you are building new UI for Domus — whether you are a human or an AI agent — check your work against each pattern.

### P1: Token-Only Color

Never use raw color values in components. Every `bg-`, `text-`, and `border-` class must reference a semantic token: `bg-surface`, `text-on-surface`, `border-outline`, `bg-primary`, etc. No `bg-gray-100`. No `#d1684e`. No `rgb(...)` in component code.

If you need a color that doesn't have a token, the design system needs to be extended first. Don't work around it with a hardcoded value.

**Rationale:** The warmth of Domus is encoded in the token pipeline. Raw colors bypass the tonal system and break theme consistency.

### P2: Depth Through Elevation, Not Decoration

Depth comes from two mechanisms: the shadow scale (`shadow-resting` → `shadow-elevated`) and the surface tone scale (`surface-sunken` < `surface` < `surface-raised`). Nothing else.

No gradients on surfaces. No `backdrop-filter: blur()`. No borders stacked on borders to fake depth. No background images or noise textures.

**Rationale:** OS1 created depth through transparency layers on a warm background. Domus translates this into an elevation system that works across light and dark themes without performance-costly effects.

### P3: The Agent Glow Is Sacred

The warm glow on entity borders (`box-shadow` using `--color-agent`) is the single most important visual signal in Domus. It means *"the agent just did something here."* No other UI element may use a similar glow effect.

Don't add glows to buttons, inputs, hover states, or decorative elements. The glow is reserved exclusively for agent-origin entity changes.

**Rule:** If `created_by === 'agent'` and the entity was touched recently → glow. Otherwise → no glow. No exceptions.

### P4: Three Sizes, Two Weights, One Typeface

Typography is `text-body` (14px/400), `text-label` (12px/500), and `text-title` (16px/600) on the system font stack. That's it.

No 24px headings. No bold body text. No italic for emphasis. No custom web fonts. If your component needs a font size outside this table, the component design is wrong — restructure it to work within the three sizes.

### P5: Spacing Is a Multiple of 4

Every margin, padding, and gap is a multiple of 4px. Use the token scale: `gap-1` (4px) through `gap-6` (24px). Internal padding for containers is `p-4` (16px), always. Don't eyeball spacing — use the tokens.

### P6: Agent Animates, User Is Immediate

When the agent creates, moves, or updates an entity: animate it with spring physics across three duration tiers (fast ~100ms, medium ~200ms, slow ~350ms). When the user drags, resizes, types, or clicks: zero transition delay, instant response.

This asymmetry is how the user subconsciously distinguishes "I did that" from "the agent did that." It's not cosmetic — it's communicative.

### P7: Accent Scarcity

The `primary` color appears in exactly three contexts:

1. Focused entity borders (30% opacity highlight)
2. Interactive element hover states
3. The agent glow

If you're applying `primary` anywhere else, you need explicit justification. Color scarcity is what makes the agent's actions visible. If everything is colorful, nothing stands out.

### P8: No Chrome Sprawl

The total icon budget for the application:

- App icons in entity headers (16px, one per window)
- Window controls: minimize, maximize, close
- Chat send button

That's it. No icon-heavy toolbars. No floating action buttons. No sidebar navigation with a column of icons. Every icon added dilutes the spatial interface and pushes Domus toward conventional app chrome.

### P9: Flat Surfaces, Real Shadows

Surfaces are flat solid colors from the tonal palette. Shadows are the sole indicator of elevation. Radius is soft on everything (6–16px from the radius scale), but nothing is circular except avatars.

No gradients. No noise textures. No background images. No frosted glass.

### P10: Entities, Not Pages

There are no "pages" in Domus. Everything is an entity rendered at a position on a spatial canvas. If you're building something that feels like a full-page layout with a header, sidebar, and main content area — you're building the wrong thing. Build an entity type with a component that renders inside a window, card, or sidebar panel.

### P11: Respect User Preferences

Honor `prefers-reduced-motion` (all animations → instant state changes, glow → static border highlight), `prefers-color-scheme` (automatic theme switching), and system font size settings. Domus is a tool that lives inside the user's OS — it doesn't fight the environment.

### P12: Inline Feedback, No Interruptions

Errors, confirmations, and status updates appear inline — inside the chat flow as chips, inside entity chrome as state changes, or as the agent glow. Never use:

- Toast notifications
- Modal dialogs (for feedback — modals for destructive confirmations are acceptable)
- Snackbars or banners
- Skeleton loading screens

If the agent fails, it says so in chat. If it succeeds, the entity glows. The spatial interface is the feedback mechanism.

---

## Design System Foundation

### Tonal Logic (Material Design 3 Influence)

We adopt MD3's **relational color system** — not its components, not its specific palettes, but its core insight: colors are generated from relationships, not picked from swatches.

**How it works:**

1. **Seed hues** — Two brand hues define the identity. A primary (warm, ~30-40 on oklch hue wheel) and a secondary (cool, ~240-260). These are the only hand-picked values.

2. **Tonal palettes** — From each seed, generate a 13-step tonal palette (0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, ... 100) in oklch. Light theme pulls from the light end. Dark theme pulls from the dark end. Same hues, different tones.

3. **Semantic roles** — Every surface, text, and border maps to a role, not a raw color:

| Role | What it means | Light | Dark |
|---|---|---|---|
| `surface` | Default background | tone-99 | tone-6 |
| `surface-raised` | Cards, windows | tone-100 | tone-10 |
| `surface-sunken` | Inset areas, wells | tone-96 | tone-4 |
| `on-surface` | Primary text | tone-10 | tone-90 |
| `on-surface-muted` | Secondary text | tone-30 | tone-60 |
| `outline` | Borders, dividers | tone-50 at 20% opacity | tone-50 at 15% opacity |
| `primary` | Brand accent, interactive elements | primary tone-40 | primary tone-80 |
| `on-primary` | Text on primary | tone-100 | tone-20 |
| `agent` | Agent-origin indicator | primary tone-50 | primary tone-60 |
| `error` | Error states | error tone-40 | error tone-80 |

4. **No raw colors in components.** Every `bg-`, `text-`, `border-` class references a semantic token. If you write `bg-orange-500` in a component, you're doing it wrong. Write `bg-agent` or `bg-primary`.

### Tailwind v4 Integration

Tailwind v4 uses CSS-first configuration. The token pipeline outputs CSS custom properties, and Tailwind consumes them natively:

```css
/* tokens.css */
@theme {
  --color-surface: oklch(0.99 0.005 var(--hue-primary));
  --color-surface-raised: oklch(1.0 0 0);
  --color-surface-sunken: oklch(0.96 0.005 var(--hue-primary));
  --color-on-surface: oklch(0.1 0.01 var(--hue-primary));
  --color-on-surface-muted: oklch(0.3 0.01 var(--hue-primary));
  --color-outline: oklch(0.5 0.01 var(--hue-primary) / 0.2);
  --color-primary: oklch(0.5 0.15 var(--hue-primary));
  --color-on-primary: oklch(1.0 0 0);
  --color-agent: oklch(0.55 0.18 var(--hue-primary));
  --color-error: oklch(0.5 0.2 25);

  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-window: 1rem;

  --shadow-resting: 0 1px 3px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.06);
  --shadow-elevated: 0 8px 24px oklch(0 0 0 / 0.12), 0 2px 8px oklch(0 0 0 / 0.08);
}

[data-theme="dark"] {
  --color-surface: oklch(0.13 0.01 var(--hue-primary));
  --color-surface-raised: oklch(0.18 0.01 var(--hue-primary));
  --color-surface-sunken: oklch(0.09 0.005 var(--hue-primary));
  --color-on-surface: oklch(0.9 0.01 var(--hue-primary));
  --color-on-surface-muted: oklch(0.6 0.01 var(--hue-primary));
  --color-outline: oklch(0.5 0.01 var(--hue-primary) / 0.15);
  --color-primary: oklch(0.75 0.12 var(--hue-primary));
  --color-on-primary: oklch(0.15 0.02 var(--hue-primary));
  --color-agent: oklch(0.65 0.15 var(--hue-primary));
  --color-error: oklch(0.75 0.15 25);

  --shadow-resting: 0 1px 3px oklch(0 0 0 / 0.2), 0 1px 2px oklch(0 0 0 / 0.15);
  --shadow-elevated: 0 8px 24px oklch(0 0 0 / 0.3), 0 2px 8px oklch(0 0 0 / 0.2);
}
```

Then in components: `bg-surface`, `text-on-surface`, `border-outline`, `shadow-elevated`. Zero magic strings.

### Typography

One typeface. Two weights. Three sizes that matter.

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `text-body` | 0.875rem / 14px | 400 | 1.5 | Everything |
| `text-label` | 0.75rem / 12px | 500 | 1.5 | Metadata, timestamps, entity type badges |
| `text-title` | 1.0rem / 16px | 600 | 1.5 | Window titles, section headers |

Line-height is **1.5 across all sizes**. Comfortable readability. No exceptions, no per-size overrides.

The typeface: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`). We are not a marketing site. We are a tool. The OS font is the right font.

No `text-xl`. No `text-3xl`. If you need a size that isn't in this table, the design is wrong.

### Spacing

4px base unit. Everything is a multiple of 4.

| Token | Value | Use |
|---|---|---|
| `gap-1` | 4px | Tight: icon-to-label, heading-to-content |
| `gap-2` | 8px | Default: between sibling elements, content tile grids |
| `gap-3` | 12px | Comfortable: content-to-action separation |
| `gap-4` | 16px | Sections within a window |
| `gap-6` | 24px | Between major regions |

### Padding Family

Beyond the base spacing scale, specific padding tokens govern component internals and spatial relationships.

#### Container Padding

| Context | Value | Notes |
|---|---|---|
| Window content | `p-4` (16px) | Non-negotiable. Consistent internal padding. |
| Card content area | `p-3` (12px) | Below the image zone, for text/metadata. |
| Scroll views | Inherits parent | No additional padding — scroll containers are just overflow wrappers. |
| Canvas viewport edge | 0 | Canvas is boundless. No artificial margins at the browser edge. |

#### Button Internals

One button size. Three variants. 36px height.

| Variant | Height | Horizontal Padding | Vertical Padding | Icon Size |
|---|---|---|---|---|
| Icon + Text | 36px | 12px | 8px | 16px |
| Text only | 36px | 12px | 8px | — |
| Icon only | 36px | 8px | 8px | 16px |

#### Header Heights

| Element | Height |
|---|---|
| Window title bar | 40px |
| Bottom sheet header | 48px (close button + title) |

#### Relational Spacing (Semantic Gaps)

Spacing between elements is not uniform — it encodes the relationship between them.

| Relationship | Token | Value | Example |
|---|---|---|---|
| Tight coupling | `gap-tight` | 4px | Heading → paragraph below, icon → label |
| Sibling elements | `gap-normal` | 8px | Paragraph → paragraph, list items, form fields |
| Content → action | `gap-loose` | 12px | Body text → CTA button below, description → action bar |

These three relational tokens replace guesswork. When placing two elements vertically: ask "are they tightly coupled, siblings, or separated by intent?"

#### Grid Gaps (Context-Dependent)

| Grid type | Gap | Rationale |
|---|---|---|
| Image grids | 4px (`gap-1`) | Tight mosaic feel. Images look better nearly touching. |
| Content tile grids | 8px (`gap-2`) | Breathing room for text-bearing tiles. |

#### Line Heights

All three text sizes use a line-height of **1.5**. Comfortable readability without wasting vertical space. No exceptions.

### Radius

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 6px | Buttons, inputs, chips |
| `rounded-md` | 12px | Cards, dropdowns, popovers |
| `rounded-lg` | 16px | Windows, bottom sheets (top corners) |

Domus is soft but not bubbly. Everything has radius. Nothing is a circle (except avatars).

**Concentric radius rule:** Inner elements derive their radius from the parent container to maintain concentricity. A button (`rounded-sm`: 6px) inside a card (`rounded-md`: 12px) inside a window (`rounded-lg`: 16px) maintains visual harmony — the inner curves nest smoothly within the outer curves. When a container's padding decreases, its child radius decreases proportionally. The formula: `child-radius = parent-radius - parent-padding`. If the result is ≤ 0, the child gets no radius.

---

## Visual Feedback Vocabulary

The agent acts on the world. The user must see those actions *spatially*, not just read about them in chat. Every agent action has a visual consequence.

### Entity States

| State | Visual Treatment | Duration |
|---|---|---|
| **Agent-creating** | Entity scales up from origin point and flies to resting position. Warm glow on the border (`shadow-agent`). Spring easing, crisp settle. | ~350ms spring |
| **Agent-updating** | Brief pulse on the changed region — a 1px highlight sweep across the updated content area. | ~200ms spring |
| **Agent-moving** | Smooth position transition with spring physics. The entity glides, it doesn't teleport. | ~350ms spring |
| **User-dragging** | No transition. Direct 1:1 pointer tracking. Slight shadow elevation increase during drag. | Immediate |
| **Focused** | Elevated shadow (`shadow-elevated`). Title bar at full opacity. Unfocused windows: resting shadow + dimmed title bar (opacity 0.6). | ~200ms spring |
| **Unfocused** | Resting shadow (`shadow-resting`). Title bar dims (opacity 0.6). Content remains fully readable. | ~200ms spring |
| **Archiving** | Scale down toward origin point (1.0 → 0.95, opacity → 0). Reverses the creation animation. Spring easing. | ~350ms spring |

### The Agent Glow

When the agent creates or significantly updates an entity, it gets a **warm glow** — a soft colored shadow that fades over a few seconds. This is the single most important visual signal in Domus. It answers: "what did the agent just do?"

```css
.entity-agent-glow {
  box-shadow:
    0 0 0 1px var(--color-agent / 0.3),
    0 0 20px 4px var(--color-agent / 0.15),
    var(--shadow-elevated);
  transition: box-shadow 2s ease-out;
}

.entity-agent-glow-fading {
  box-shadow: var(--shadow-elevated);
}
```

- Appears instantly on agent action
- Fades to normal shadow over 2 seconds
- Only on entity chrome (window border / card border), not on content
- Color comes from `--color-agent` token — warm, not neon

### Canvas Indicators

| Indicator | What it communicates | Visual |
|---|---|---|
| **Agent activity pulse** | Agent is processing (tool calls in flight) | Subtle radial pulse emanating from the chat input area. Concentric rings, very low opacity (0.05), expanding outward. Think: sonar ping. |
| **Entity connection lines** | Two entities are related (knowledge graph) | Thin (1px) dashed lines between connected entities on the canvas. Only shown on hover of either entity or when agent references the relationship. Color: `outline` token. |
| **Drop zone** | Entity is being dragged near a valid rearrangement target | Faint highlight rectangle where the entity would land. No snapping by default — free placement. |

### Chat Indicators

The agent chat panel is the secondary interface. It confirms what the spatial UI shows, it doesn't replace it.

| Indicator | Visual |
|---|---|
| **Agent thinking** | Three-dot animated ellipsis. No "typing" animation on text — text appears in chunks as it streams. |
| **Tool call in progress** | Inline chip: `[creating note...]` with a subtle shimmer. Chip resolves to `[created "Meeting Notes"]` with a link that focuses the entity on canvas. |
| **Tool call complete** | Chip stops shimmer, shows entity name as clickable link. Click → scrolls canvas to entity + focuses it. |
| **Error** | Red-tinted chip: `[failed: reason]`. No modal. No toast. Inline in the conversation flow. |
| **Model indicator** | Tiny muted label below agent messages: "claude" or "gemini". Only shown if the user has multi-model enabled. |

---

## Component Patterns

### Windows

```
┌─────────────────────────────────────┐  ← rounded-lg, shadow-elevated (focused)
│  ◉  Title                     ─ □ ✕ │  ← 40px title bar, text-title
├─────────────────────────────────────┤  ← 1px border-outline
│                                     │
│   [App content, p-4 internal]       │  ← bg-surface-raised
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- Title bar: 40px height. App icon (16px) + title text. Window controls on the right: minimize (collapse to title bar), maximize (not fullscreen — expand to fill available canvas), close (archive entity).
- Focus state: `shadow-elevated` + full-opacity title bar. Unfocused: `shadow-resting` + title bar dims to 0.6 opacity. The title bar is the primary focus indicator.
- Drag: entire title bar is the drag handle.
- Resize: corner and edge handles, 8px hit area, cursor changes.
- No tab system. No nested navigation within windows. One entity = one window = one view. If you need tabs, you need multiple entities.

### Cards

Cards are compact entity previews on the canvas. Portrait proportion. They summarize what the user would see in full when opening a sheet or window. Two variants depending on content type.

#### Image Card

```
┌───────────────────────┐  ← rounded-md, shadow-resting
│                       │
│  [Image, edge-to-edge]│  ← No padding. Image fills to container edges.
│                       │
│                       │
│                       │
│  type · timestamp     │  ← text-label, p-3, bg-surface-raised
└───────────────────────┘
```

#### Text Card

```
┌───────────────────────┐  ← rounded-md, shadow-resting
│                       │
│  Title                │  ← text-title, p-3
│                       │
│  Summary text that    │  ← text-body, on-surface-muted
│  previews the full    │     Truncated to fit card height.
│  document content...  │
│                       │
│  type · timestamp     │  ← text-label, on-surface-muted
└───────────────────────┘
```

**Hover state — action overlay with scrim:**

```
┌───────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░ │  ← gradient scrim (transparent → dark)
│  ░ [⤢] [+ctx] [share]│  ← action icons, top-right cluster
│                       │
│  [Content beneath]    │
│                       │
│                       │
│  type · timestamp     │
└───────────────────────┘
```

- **Image card — image zone:** Edge-to-edge, no inset. Images fill the card to its rounded corners (overflow hidden).
- **Text card — content zone:** Full `p-3` (12px) padding. Title + summary text (truncated/clamped to card height). The summary is a preview of the full document the user would see in a sheet.
- **Metadata:** Both variants show type label + timestamp at the bottom. `text-label`, `on-surface-muted`.
- **Action overlay:** Hidden by default. On hover, a gradient scrim fades in with action icons: maximize (expand to window/sheet), add to agent context, share. Icons are 16px, white, on the scrim.
- **Click:** Opens the full content — either expands into a window or opens as a bottom sheet for document-length content. The card is the preview; the sheet/window is the full view.
- **Drag:** Entire card is the drag handle.
- Fixed size per card type (from `defaultSize` in app definition).

### Sidebar Panels

Full-height panels docked to the left sidebar.

- Stack vertically, scrollable.
- 280px fixed width (sidebar width minus padding).
- Collapsible to just the title row.
- No drag, no resize. Position is determined by order, not coordinates.

### Agent Chat

Fixed-position panel. Always visible. Bottom-right or right-side dock.

- Input: single-line text input that expands to multi-line on focus. Send on Enter, newline on Shift+Enter.
- Messages: minimal chrome. User messages right-aligned, agent messages left-aligned. No avatars. No timestamps unless hovered.
- Tool call chips inline with message flow.
- Scrolls to bottom on new messages. Sticky scroll.

### Bottom Sheet

Full-width overlay that slides up from the bottom edge. Used when the user needs to focus on specific content or when content is a full document (e.g., long-form reading, document editing, settings).

```
┌─────────────────────────────────────────────────┐
│                                                 │  ← ~80-100px top inset
│   ┌─────────────────────────────────────────┐   │     (canvas visible, scaled
│   │ [scaled-down canvas content behind]     │   │      down to ~0.95 scale)
│   └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  Title                                     ✕    │  ← 48px header, close button
├─────────────────────────────────────────────────┤
│                                                 │
│  [Sheet content, p-4 internal]                  │  ← bg-surface-raised
│                                                 │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Top inset:** ~80-100px gap at the top. The canvas content behind is visible but scaled down (~0.95) and dimmed, iOS-style. This maintains spatial orientation — the user knows they're still in Domus.
- **Background treatment:** Canvas content scales down slightly and dims (opacity ~0.5) when the sheet is open. This accentuates spatial hierarchy — the sheet is "above" the canvas in z-space.
- **Header:** 48px height. Title text + close button (right-aligned). No drag handle — desktop-first, no swipe-to-dismiss.
- **Dismiss:** Close button in the header OR click the visible canvas area above the sheet (tap-outside).
- **Animation:** Slides up from the bottom edge of the viewport. Spring easing, `duration-slow` (~350ms). Background content scales down simultaneously.
- **Width:** Full viewport width. No side margins.
- **Corner radius:** `rounded-lg` (16px) on top corners only. Bottom corners are flush with viewport edge.

---

## Image Fill Behavior

Images are first-class content in Domus. How they fill containers matters.

### Rule: Images Go Edge-to-Edge in Cards

Card images fill the entire image zone with zero inset. The card's `border-radius` with `overflow: hidden` clips the image to the rounded corners. No padding between image and card edge.

### Rule: Windows Respect Content Padding (Usually)

Window content gets `p-4` (16px) padding, including images displayed inline. Exception: when the image IS the window's background (e.g., a chat app background, a full-screen image viewer), it fills edge-to-edge.

### Rule: Grid Images Use Context-Dependent Gaps

Image grids inside windows use `gap-1` (4px) between tiles for a tight mosaic feel. Content tile grids (with text) use `gap-2` (8px) for breathing room.

---

## Motion Principles

### 1. Agent Animates, User Is Immediate

When the agent creates a window, it springs into existence. When the user drags a window, it tracks the pointer with zero delay. This asymmetry is how the user subconsciously distinguishes "I did that" from "the agent did that."

### 2. Everything Comes From Somewhere

If something comes into view, it has a spatial origin. No elements materialize from nowhere.

- A bottom sheet slides up from the bottom edge.
- A window scales up from the icon or button that spawned it.
- A context menu expands from the click point.
- A card action overlay fades in from the card surface.

If there is no spatial trigger (e.g., a keyboard shortcut with no anchor element), the entity grows from a seed shape at the center of the viewport — a small circle that morphs into the final rectangular surface through gradual transition.

### 3. Spawn Animation: Scale-Up + Fly-to-Position

When a new entity is created, it starts as a scaled-down version of itself at the origin point (the trigger element, or center of viewport as fallback), then scales up and moves to its resting position on the canvas. This is the iOS app-launch pattern adapted for a spatial canvas. The reverse plays on archival — the entity shrinks back toward its origin.

### 4. Spring Physics

All animations use spring easing. Crisp settle with minimal overshoot — professional, not playful. The slight overshoot gives motion a physical quality without feeling bouncy.

Spring parameters (reference values for implementation):
- **Stiffness:** ~170
- **Damping:** ~26
- **Mass:** 1

These produce a crisp snap with barely perceptible overshoot. Not the iOS springy bounce. Closer to the Linear/Vercel motion feel.

### 5. Three Duration Tiers

| Tier | Duration | Use |
|---|---|---|
| `duration-fast` | ~100ms | Hover/press feedback, opacity changes, color transitions |
| `duration-medium` | ~200ms | Component transitions, focus state changes, menu open/close |
| `duration-slow` | ~350ms | Entity creation, archival, sheet open/close, window spawn |

Exception: agent glow fade-out at 2s — deliberately slow because it's ambient, not interactive.

With spring physics, these durations are approximate — the spring settles naturally. Use these as target durations when configuring spring parameters.

### 6. Reduce Motion

Respect `prefers-reduced-motion`. All animations → instant state changes. Glow → static border highlight. Spring transitions → immediate. The spatial origin principles still apply conceptually (elements appear at their final position), but no motion occurs.

---

## Color Philosophy

Domus is **warm and quiet**. Not sterile-white productivity tool. Not neon-dark hacker aesthetic.

- Light theme: warm off-white surfaces (slight primary hue tint). High contrast text. The feel of good paper.
- Dark theme: deep warm gray, not pure black. Slightly tinted toward primary hue. The feel of a well-lit room at night.
- Accent use is minimal. The `primary` color appears on: focused entity borders, interactive element hover states, the agent glow. That's it. Color scarcity makes the agent's actions pop.
- The canvas background is `surface-sunken` — slightly recessed. Windows and cards sit on top as `surface-raised`. This creates depth without fake 3D.

---

## Anti-Patterns

Things we explicitly will not do:

- **Gradients on surfaces.** Flat with subtle shadow. Gradients are for marketing sites.
- **Blur/frosted glass.** Performance cost. Accessibility issues. Flat opacity instead.
- **Icon-heavy navigation.** We have: app icons in entity headers, window controls, and the chat send button. That's the icon budget.
- **Toast notifications.** Agent actions are communicated spatially (entity glow) and inline (chat chips). No floating toast stack.
- **Skeleton loading screens.** Entities either exist or don't. The agent glow handles the "just appeared" moment. No gray placeholder boxes.
- **Confetti, particles, or celebratory animations.** This is a workspace.
- **Custom scrollbars.** Use the OS default. We are a tool that lives inside the OS.

---

## Agent Guardrails Checklist

This section is a quick-reference for AI agents (and humans) building or reviewing Domus UI. Run through this checklist before considering any component complete.

### Before Writing Any Component

- [ ] **Read the entity model.** Your component renders inside a window, card, or sidebar panel. It does not own its own layout, chrome, or positioning. Understand what `AppProps` gives you.
- [ ] **Identify the presentation type.** Is this a `window`, `card`, or `sidebar` component? Each has different chrome, sizing, and interaction rules (see Component Patterns above).
- [ ] **Check if an existing app covers this.** Don't create a new entity type if an existing app can handle it with a state extension.

### Color Check

- [ ] Every `bg-` class uses a semantic token (`surface`, `surface-raised`, `surface-sunken`, `primary`, `error`).
- [ ] Every `text-` class uses a semantic token (`on-surface`, `on-surface-muted`, `on-primary`).
- [ ] Every `border-` class uses `outline` or a semantic token.
- [ ] No hex values, `rgb()`, `rgba()`, `hsl()`, or Tailwind palette colors (`gray-100`, `blue-500`, etc.) in component code.
- [ ] The `primary` color is only used for: focused borders, hover states, or agent glow.

### Typography Check

- [ ] Only three font sizes used: `text-body` (14px), `text-label` (12px), `text-title` (16px).
- [ ] Only three font weights used: 400 (body), 500 (label), 600 (title).
- [ ] No custom font families — system font stack only.
- [ ] No `font-bold`, `font-light`, `italic`, `text-xl`, `text-2xl`, etc.

### Spacing Check

- [ ] All spacing values are multiples of 4px.
- [ ] Container internal padding is `p-4` (16px).
- [ ] Gaps between elements use the token scale (`gap-1` through `gap-6`).
- [ ] No magic numbers for margins or padding (no `mt-[7px]`, no `p-[13px]`).

### Spacing Check (Extended)

- [ ] Relational gaps use semantic tokens: `gap-tight` (4px), `gap-normal` (8px), `gap-loose` (12px).
- [ ] Image grids use `gap-1` (4px). Content tile grids use `gap-2` (8px).
- [ ] Scroll containers have no additional padding — they inherit from the parent.
- [ ] Buttons are 36px height with correct variant padding (see Padding Family).

### Elevation Check

- [ ] Component uses the correct shadow: `shadow-resting` (cards, buttons at rest) or `shadow-elevated` (windows, sheets, popovers).
- [ ] No `backdrop-filter` (no blur, no brightness adjustments).
- [ ] No gradients on any surface.
- [ ] Radius uses the token scale: `rounded-sm` (6px), `rounded-md` (12px), `rounded-lg` (16px).
- [ ] Inner element radius maintains concentricity with parent container (`child-radius = parent-radius - parent-padding`).

### Motion Check

- [ ] Agent-triggered state changes use spring easing (crisp, minimal overshoot).
- [ ] User-triggered state changes are instant (no transition).
- [ ] All spring animations use the standard parameters (~170 stiffness, ~26 damping).
- [ ] Durations match the three tiers: fast (~100ms), medium (~200ms), slow (~350ms). Exception: 2s for agent glow fade.
- [ ] New elements have a spatial origin — they come FROM somewhere (trigger element, or center-of-viewport seed shape).
- [ ] `prefers-reduced-motion` is respected — all motion becomes instant, glow becomes a static border.

### Image Fill Check

- [ ] Card images go edge-to-edge (no inset), clipped by `overflow: hidden` + `border-radius`.
- [ ] Window content images respect `p-4` padding unless the image IS the background (full-bleed exception).
- [ ] Image grid gaps use `gap-1` (4px) for tight mosaic feel.

### Feedback Check

- [ ] No toast notifications, snackbars, or floating banners.
- [ ] No modal dialogs for success/error feedback (modals only for destructive action confirmation).
- [ ] No skeleton loading screens.
- [ ] Errors are communicated inline (chat chips or entity state).
- [ ] The agent glow is not used for anything other than agent-origin entity changes.

### Chrome Check

- [ ] No new icons beyond: app icon in entity header, window controls, chat send button.
- [ ] No toolbar or navigation bar added to the component.
- [ ] No tabs or nested navigation within a window.
- [ ] One entity = one window = one view.

### Accessibility Check

- [ ] `prefers-reduced-motion` handled (see Motion Check).
- [ ] `prefers-color-scheme` respected via the token system (light/dark tokens auto-switch).
- [ ] Interactive elements have visible focus states using `primary` at 30% opacity.
- [ ] Text contrast meets WCAG AA against its background surface token.
- [ ] No `user-select: none` on content the user might want to copy.
