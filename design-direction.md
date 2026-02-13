# Domus — Design Direction

How Domus looks, feels, and communicates. This document governs every visual decision.

---

## Core Premise

Domus is an environment that responds to you. The design must make the agent's actions feel **spatial** (things appear, move, glow, fade) rather than **textual** (chat bubble, chat bubble, chat bubble). The UI is a room, not a feed.

The agent is not a chatbot that happens to have a canvas. The canvas IS the interface. Chat is one input surface among many.

---

## Design Lineage: OS1 → Domus

Domus is a rewrite of [OS1](https://github.com/TheRealClodius/OS1), the previous version of this project. OS1 established the core design identity — Domus inherits its visual language and evolves it into a more complete spatial system. Understanding what carries over and what changes prevents drift toward generic SaaS aesthetics.

### What We Inherit from OS1

**Warmth as identity.** OS1 established warm tonal surfaces as the core visual identity. Every UI element participates in a warm color system — depth comes from transparency and tonal shifts, not from a palette of competing colors. Domus inherits this: warm hue tints on every surface, accent scarcity, and the feeling that the interface is a *place* rather than a *page*.

**The interface as environment.** OS1 treated the screen as a spatial surface, not a document. Domus takes this further — the canvas is a room you walk into, not a page you scroll through. Entities have positions, not rows.

**Agent presence as motion.** OS1 used visual indicators to communicate agent activity and aliveness. Domus translates this into the agent glow: a warm halo on entity borders that fades over seconds, communicating "the agent was just here" without a dedicated animation widget.

**Radical restraint.** OS1 was visually restrained — limited color, minimal chrome, opacity as the primary tool for hierarchy. Domus follows this restraint: one typeface, three sizes, two weights, accent color in exactly three places.

**Glassmorphism on overlays.** OS1 used `backdrop-filter: blur()` with semi-transparent surfaces on its prompt bar and conversation panel. Domus preserves this on overlay surfaces (prompt bar, conversation panel, context menus, bottom sheet) while using flat tonal surfaces for multiplied entity elements.

### What We Evolve

| OS1 Approach | Domus Approach | Why |
|---|---|---|
| Monochrome-leaning palette | Semantic token system (tonal palettes from seed hues) | Domus has multiple entity types and states — pure monochrome can't communicate enough. Tokens preserve warmth while adding semantic range. |
| Depth from transparency layers | Depth from elevation shadows for entities, blur for overlays | Domus has a spatial canvas with overlapping windows — shadows communicate stacking order for entities. Overlay surfaces keep OS1's blur. |
| Single-surface interaction | Windowed spatial canvas (entities in draggable windows/cards) | Domus is a workspace with rich visual entities — it needs the window metaphor to manage spatial complexity. |
| Ultra-light typography | Functional typography (weight 400-600) | Domus has dense information in windows — readability wins over aesthetics. |
| Pill-shaped / organic geometry | Soft rectangles (6-16px radius scale) | Entities contain structured content (notes, calendars, code). Rectangular containers are functional. Generous radius keeps it soft without fighting the content. Prompt bar retains pill shape from OS1. |

### The Emotional Test

When evaluating any new Domus UI, apply this gut check:

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

### P2: Depth Through Elevation and Layering

Depth comes from two mechanisms: the shadow scale (`shadow-resting` → `shadow-elevated`) and the surface tone scale (`surface-sunken` < `surface` < `surface-raised`).

For **entity surfaces** (windows, cards): flat tonal backgrounds with shadows. No gradients. No blur. These elements are multiplied across the canvas — they must be cheap to render.

For **overlay surfaces** (prompt bar, conversation panel, context menus, bottom sheet, popovers): `backdrop-filter: blur()` with semi-transparent backgrounds is allowed and encouraged. These are singleton elements that float above the entity layer — blur visually separates the "agent layer" from the "spatial layer" and the performance cost is negligible.

No borders stacked on borders to fake depth. No background images or noise textures.

**Rationale:** OS1 used transparency layers on a warm background to create depth. Domus preserves this on overlay surfaces (blur + transparency) while using flat tonal surfaces + shadows for multiplied entity elements where performance matters.

### P3: The Agent Glow Is Sacred

The warm glow on entity borders (`box-shadow` using `--color-agent`) is the single most important visual signal in Domus. It means *"the agent just did something here."* No other UI element may use a similar glow effect.

Don't add glows to buttons, inputs, hover states, or decorative elements. The glow is reserved exclusively for agent-origin entity changes.

**Rule:** If `created_by === 'agent'` and the entity was touched recently → glow. Otherwise → no glow. No exceptions.

### P4: Three Sizes, Two Weights, One Typeface

UI chrome typography is `text-body` (14px/400), `text-label` (12px/500), and `text-title` (16px/600) on the system font stack. That's it for title bars, metadata, labels, buttons, and all structural UI.

Rendered content inside entities (markdown, rich text) uses the extended content typography scale (see Content Typography section) — h1 20px, h2 18px, h3 16px, code 13px monospace. These sizes only exist inside entity content areas, never in chrome.

No bold body text. No italic for emphasis. No custom web fonts. If your chrome element needs a font size outside the three-size table, the design is wrong — restructure it to work within the three sizes.

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
- App icons in the sidebar launcher (16px, one per app type)
- Window controls: minimize, maximize, close
- Chat send button
- Context menu item icons (16px, where semantically useful)

That's it. No icon-heavy toolbars. No floating action buttons. Every icon added dilutes the spatial interface and pushes Domus toward conventional app chrome.

### P9: Flat Surfaces, Real Shadows

Entity surfaces (windows, cards) are flat solid colors from the tonal palette. Shadows are the sole indicator of elevation for entities. Radius is soft on everything (6–16px from the radius scale), but nothing is circular except avatars.

Overlay surfaces (prompt bar, conversation panel, context menus, bottom sheet) use glassmorphism: semi-transparent backgrounds with `backdrop-filter: blur()`. This is the visual separator between the spatial entity layer and the floating agent/chrome layer.

No gradients on any surface. No noise textures. No background images.

### P10: Entities, Not Pages

There are no "pages" in Domus. Everything is an entity rendered at a position on a spatial canvas. If you're building something that feels like a full-page layout with a header, sidebar, and main content area — you're building the wrong thing. Build an entity type with a component that renders inside a window, card, or sidebar panel.

### P11: Respect User Preferences

Honor `prefers-reduced-motion` (all animations → instant state changes, glow → static border highlight), `prefers-color-scheme` (automatic theme switching), and system font size settings. Domus is a tool that lives inside the user's OS — it doesn't fight the environment.

### P12: Inline Feedback, No Interruptions

Errors, confirmations, and status updates appear inline — inside the chat flow as chips, inside entity chrome as state changes, or as the agent glow. Never use:

- Toast notifications
- Modal dialogs (for feedback — modals for destructive confirmations are acceptable)
- Snackbars or banners

Entities that load asynchronous content use transitive state indicators (shimmer placeholders) — see Entity Transitive States. These are warm, minimal loading indicators, not heavy skeleton screens that try to mimic final layout.

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

No `text-xl`. No `text-3xl`. If you need a size that isn't in this table for UI chrome, the design is wrong.

### Content Typography (Inside Entities Only)

Rendered markdown and rich content inside entity content areas (note bodies, chat messages, document views) use an extended type scale. These sizes exist **only** inside content rendering areas — never in chrome (title bars, metadata, labels, buttons).

| Element | Size | Weight | Style | Notes |
|---|---|---|---|---|
| h1 | 1.25rem / 20px | 600 | — | Largest heading inside content |
| h2 | 1.125rem / 18px | 600 | — | |
| h3 | 1.0rem / 16px | 600 | — | Same as `text-title` |
| Body | 0.875rem / 14px | 400 | — | Same as `text-body` |
| Code (inline) | 0.8125rem / 13px | 400 | monospace | `surface-sunken` background, 2px horizontal padding, `rounded-sm` |
| Code (block) | 0.8125rem / 13px | 400 | monospace | `surface-sunken` background, `p-3` padding, `rounded-md`, horizontal scroll if needed |
| Blockquote | 0.875rem / 14px | 400 | — | 2px left border in `outline`, `p-3` left padding, `on-surface-muted` text |
| List (ul/ol) | 0.875rem / 14px | 400 | — | 20px left padding, `gap-tight` (4px) between items |
| Link | 0.875rem / 14px | 400 | underline | `primary` color, underline on hover |

Line-height remains **1.5** for all content typography sizes. The monospace font uses the system monospace stack (`ui-monospace, 'SF Mono', Menlo, Monaco, monospace`).

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

### Entity Transitive States

Entities are not always in a settled state. They load data, get created, get archived. Each transitive state has a specific visual treatment.

| State | When | Visual Treatment |
|---|---|---|
| **Loading** | Entity exists but content is being fetched or generated | Entity chrome renders immediately (title bar, borders, shadow). Content area shows a shimmer: `surface-sunken` background with a gradient sweep (transparent → 5% white → transparent) moving left-to-right, repeating every 1.5s. 2-3 rounded-rectangle placeholder blocks at 5% opacity suggest content is arriving. Agent glow is active if agent-created. |
| **Creating** | Agent tool call is in flight, entity not yet persisted | Chat chip shows `[creating note...]` with shimmer. No entity appears on canvas until the tool call resolves and the entity INSERT fires via Realtime. |
| **Archiving** | Entity being removed | Scale-down animation (1.0 → 0.95, opacity → 0). Already specced in Entity States above. Spring easing, `duration-slow`. |
| **Error** | Entity failed to load or an action on it failed | Content area shows centered `on-surface-muted` text with the error message. 2px left border in `error` token. No modal, no toast. |

**Loading shimmer is not a skeleton screen.** It doesn't try to mimic the exact layout of the final content (no fake text lines, no fake image rectangles matching precise proportions). It's a minimal, warm indicator that content is arriving — just 2-3 abstract rounded rectangles on a `surface-sunken` background. When content arrives, cross-fade to real content over `duration-fast` (~100ms).

### Empty States

Every entity that can contain dynamic content must define an empty state.

**Empty canvas (new space):**
- Center of viewport: `on-surface-muted`, `text-body`
- Copy: "Talk to the agent or open an app from the sidebar."
- Below: the prompt bar, already visible and inviting input
- No illustrations. No heavy CTAs. No onboarding wizard.

**Empty entity (app-specific):**
- Centered within the entity content area
- `on-surface-muted`, `text-body`
- Copy follows the pattern: "[action verb] to get started" — e.g., "Start typing a note", "No events yet", "Drop an image here"
- No illustrations. No decorative empty-state graphics.

**No search results:**
- Same treatment: centered `on-surface-muted`, `text-body`
- Copy: "No results for [query]"

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

### Agent Chat — Prompt Bar & Conversation Panel

The agent chat is **not** a sidebar panel or a fixed dock. It's a bottom-center prompt bar with a conversation panel that pops up on demand. Adapted from the OS1 interface ([reference repo](https://github.com/TheRealClodius/OS1)).

#### Prompt Bar (always visible)

```
                    ┌─────────────────────────────┐
                    │  Chat with this Space...     │  ← pill shape, bottom-center
                    └─────────────────────────────┘
```

- **Position:** Fixed, bottom-center of the viewport, ~50px from the bottom edge. `z-index` above all entities.
- **Resting state (idle):** ~280px wide, ~48px tall. Pill shape (`rounded-lg` or ~20px radius). Just a text input with placeholder text. Glassmorphic background (semi-transparent `surface` + `backdrop-filter: blur`).
- **Active state (clicked):** Expands to ~350px wide. Context button (left) and send button (right) appear alongside the input. Spring animation for the width transition.
- **Expanded state (multi-line):** Same width, grows vertically as content needs more lines. Max ~8 lines, then internal scroll. Layout switches from horizontal (input + send) to vertical stack (context chips → textarea → button row).
- **Border:** Thin outline at low opacity in idle. Thicker, softer outline on focus (glow effect at low opacity — this is not the agent glow, it's input focus feedback).
- **Send:** Enter to send, Shift+Enter for newline.

#### Conversation Panel (on demand)

- **Trigger:** After sending a message, a chat bubble appears above the prompt bar showing the latest exchange. Clicking the bubble expands into the full conversation panel.
- **Expansion:** Grows upward from the bubble's position. Spring animation. Glassmorphic background (blur + transparency). Max width ~600px, height dynamic (viewport height minus prompt bar minus top margin).
- **Dismiss:** Minimize button in the panel header, or click outside the panel. The prompt bar stays visible — only the conversation panel dismisses.
- **Auto-minimize:** When entity windows overlap the prompt bar area, the conversation panel auto-minimizes. Restores when overlap clears.
- **Hidden when maximized:** When any entity window is maximized, the entire prompt bar fades out and becomes non-interactive.

#### Chat Content

- Messages: minimal chrome. User messages right-aligned, agent messages left-aligned. No avatars. No timestamps unless hovered.
- Tool call chips inline with message flow.
- Scrolls to bottom on new messages. Sticky scroll.

#### Exact Dimensions

Exact pixel values for the prompt bar, conversation panel, and chat bubbles should be taken from the [OS1 reference implementation](https://github.com/TheRealClodius/OS1) and adapted to Domus tokens. The patterns above are the architectural spec; OS1 is the dimensional reference.

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

### Entity Context Menu

Right-click on an entity shows a context menu.

**Items:**

- **Archive** — archives the entity (plays archive animation)
- **Change presentation** → submenu: Window, Card, Sidebar
- **Duplicate** — creates a copy at an offset position (+20px, +20px)
- **Add to agent context** — pins this entity as explicit context for the next agent message

**Menu styling:**

- `surface-raised` background with `backdrop-filter: blur()` (overlay surface)
- `shadow-elevated`
- `rounded-md` (12px)
- Items: `text-body`, 36px row height, 12px horizontal padding
- Hover: surface lightens one tonal step (per interactive state rules)
- Separator: 1px `outline` between groups
- Appears at the cursor position, constrained to viewport edges
- Spring animation on open (`duration-fast`), fade out on close

**No canvas context menu.** Right-clicking empty canvas does nothing. All entity creation flows go through the sidebar app launcher or the agent.

---

## Canvas Behavior

The canvas is an infinite spatial surface. Entities live at absolute positions on this surface.

### Pan & Zoom

- **Type:** Infinite pan + zoom. No boundaries.
- **Pan:** Click-drag on empty canvas space, or middle-mouse button drag anywhere.
- **Zoom:** Scroll wheel or pinch gesture. Zooms toward the cursor position.
- **Zoom range:** 25% – 200%. Default: 100%.
- **Zoom-to-fit:** A keyboard shortcut (binding deferred to implementation) that frames all non-archived entities with comfortable padding. This is the "go home" action for when users feel lost.

### Agent Placement

The agent places entities in loose clusters near the origin. When creating a new entity, the agent checks for collisions with existing entities and offsets to avoid overlap. The agent does not scatter entities randomly across infinite space — it keeps the workspace compact and navigable.

### Viewport Culling

Only entities within the visible viewport (plus a margin buffer) are rendered. Entities far off-screen are unmounted from the DOM. This is essential for performance as entity count grows.

### Background

`surface-sunken` fills the canvas. An optional subtle dot grid at very low opacity (2-3%) provides spatial orientation — the user can see they're panning because the grid moves. The dot grid can be toggled off in settings.

---

## Sidebar — App Launcher

The left sidebar is the app launcher. It shows available app types and lets the user create entities.

### Layout

- **Width:** 280px fixed. Collapsible to icon-only mode (~48px wide).
- **Background:** `surface` with a right border of `outline`.
- **Content:** Vertical list of app types. Each row: app icon (16px) + app name (`text-label`).
- **Hover:** Row background transitions to `surface-raised`.
- **Bottom section:** Space name, user avatar, settings access.

### Click Behavior

Clicking an app in the sidebar creates a new entity of that type:
- Position: center of the current viewport
- Size: the app's `defaultSize`
- Presentation: the app's `defaultPresentation` (usually `'window'`)
- The entity spawns with the standard creation animation (scale-up + fly-to-position)

Both the user (via sidebar click) and the agent (via `create_entity` tool) can create entities. The sidebar is the user's direct creation path; the agent is the conversational creation path.

### Sidebar Panels

Entities with `presentation: 'sidebar'` render below the app launcher list in the sidebar. They stack vertically, are scrollable, and are collapsible to just their title row. Sidebar panels do not appear in the app launcher — they are entities placed there by the agent or by presentation switching.

---

## Entity Sizing & Overlap

### Size Constraints

| Presentation | Min Width | Min Height | Default Size | Resizable |
|---|---|---|---|---|
| Window | 280px | 200px | Per app `defaultSize` | Yes — corner + edge handles, 8px hit area |
| Card | Fixed per app | Fixed per app | Per app `defaultSize` | No |
| Sidebar | 280px (sidebar width) | 100px | Auto-height based on content | No (width locked to sidebar, height auto) |

No maximum size for windows — users can resize as large as they want.

### Overlap & Stacking

Entities can freely overlap on the canvas, like desktop windows. Z-index determines stacking order:

- **Focus = top:** Clicking or focusing an entity brings it to the highest z-index.
- **Agent-created entities** spawn at the top of the stack.
- **No push/collision:** Dragging an entity over another does not push it away. Free spatial placement.

### Scroll Inside Entities

- Content that overflows the entity window scrolls vertically with OS-native scrollbars.
- The scroll container is the content area below the title bar.
- No horizontal scroll unless content demands it (code blocks, wide tables).
- Programmatic scrolls (e.g., chat auto-scroll to bottom) use `scroll-behavior: smooth`.
- Scroll containers inherit parent padding — no additional padding on the scroll wrapper.
- The canvas itself does not use browser scrollbars — it pans (see Pan & Zoom above).

---

## Form Primitives

All apps compose from a shared set of form primitives. The agent uses these same primitives when building new app UIs. Never use raw HTML input elements — always use the Domus form primitives, which encode the correct tokens, states, and dimensions.

### Input

- **Height:** 36px
- **Padding:** 8px vertical, 12px horizontal
- **Background:** `surface-sunken`
- **Border:** 1px `outline`
- **Radius:** `rounded-sm` (6px)
- **Typography:** `text-body` (14px / 400)
- **Placeholder:** `on-surface-muted`
- **States:** See Interactive States Matrix

### Textarea

- **Min height:** 72px (3 lines)
- **Max height:** 200px (then scrolls internally)
- **Padding, background, border, radius:** Same as Input
- **Resize:** Vertical only (CSS `resize: vertical`)

### Select

- **Dimensions:** Same as Input (36px height)
- **Chevron:** 16px icon, right-aligned, `on-surface-muted`
- **Dropdown panel:** `surface-raised` background, `shadow-elevated`, `rounded-md`, `backdrop-filter: blur()` (overlay surface). Max 5 visible items, then internal scroll.

### Toggle

- **Size:** 40px wide, 24px tall
- **Track:** `surface-sunken` (off), `primary` (on)
- **Thumb:** 20px circle, white, `shadow-resting`
- **Transition:** `duration-fast` (~100ms)

### Checkbox

- **Size:** 18px square
- **Border:** 1px `outline`, 4px radius
- **Checked:** `primary` fill, white checkmark icon
- **Indeterminate:** `primary` fill, white dash icon

### Button

One button height. Three visual variants.

| Variant | Background | Text | Border |
|---|---|---|---|
| **Primary** | `primary` | `on-primary` | None |
| **Ghost** | Transparent | `on-surface` | None |
| **Danger** | `error` | White | None |

All variants: 36px height, 12px horizontal padding, 8px vertical padding, `rounded-sm` (6px), `text-body`. Icon-only buttons: 8px horizontal padding, 16px icon.

---

## Interactive States

### Universal State Rules

These four rules govern every interactive element in Domus. They are the logic — the reference table below is derived from them.

| State | Visual Treatment |
|---|---|
| **Hover** | Surface lightens one tonal step. `surface` → `surface-raised`, or 5% white overlay on the current background. |
| **Focus** | 2px ring using `primary` at 30% opacity. Replaces browser default outline. Visible on all focusable elements. |
| **Active / Pressed** | Surface darkens one tonal step. `surface-raised` → `surface`, or 5% black overlay on the current background. |
| **Disabled** | 50% opacity on the entire element. `pointer-events: none`. `cursor: not-allowed` on the wrapper. |

### Component Reference Table

| Component | Default | Hover | Focus | Active | Disabled |
|---|---|---|---|---|---|
| **Button (primary)** | `bg-primary`, `text-on-primary` | 5% white overlay | 2px `primary` ring at 30% | 5% black overlay | 50% opacity |
| **Button (ghost)** | Transparent, `text-on-surface` | `bg-surface-raised` | 2px `primary` ring at 30% | `bg-surface-sunken` | 50% opacity |
| **Button (danger)** | `bg-error`, white text | 5% white overlay | 2px `error` ring at 30% | 5% black overlay | 50% opacity |
| **Input / Textarea** | `bg-surface-sunken`, `border-outline` | Border darkens slightly | 2px `primary` ring at 30% | — (typing state) | 50% opacity, `bg-surface-sunken` |
| **Select** | Same as Input | Same as Input | Same as Input | Dropdown opens | 50% opacity |
| **Toggle** | Track: `surface-sunken` | Track lightens | 2px `primary` ring at 30% | — (toggles state) | 50% opacity |
| **Checkbox** | `border-outline` | Border darkens | 2px `primary` ring at 30% | — (toggles state) | 50% opacity |
| **Card** | `shadow-resting` | `shadow-elevated`, action overlay fades in | 2px `primary` ring at 30% | — | — |
| **Window title bar button** | `text-on-surface-muted` | `bg-surface` circle behind icon | — | `bg-surface-sunken` | — |
| **Link** | `text-primary`, no underline | Underline appears | 2px `primary` ring at 30% | Darken text | 50% opacity |

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

### 7. Presentation Transitions (Morph)

When an entity changes `presentation` mode (card → window, window → card, etc.), it morphs between states:

1. Capture the current bounding rect (position, size, radius) of the entity in its current presentation.
2. Calculate the target bounding rect from the new presentation's default size and position.
3. Animate between them using spring physics (`duration-slow`, ~350ms).
4. Chrome elements cross-fade during the morph: source chrome (e.g., card metadata row) fades out, target chrome (e.g., window title bar) fades in.
5. Content area scales and clips smoothly within the morphing container.
6. `prefers-reduced-motion`: instant swap, no animation.

**Specific transitions:**

| From → To | Behavior |
|---|---|
| Card → Window | Card scales up. Card metadata fades out, window title bar + controls fade in. Radius transitions `rounded-md` → `rounded-lg`. |
| Window → Card | Reverse of above. Window shrinks, chrome morphs to card layout. |
| Any → Sidebar | Entity slides to the left sidebar position, collapses to sidebar width, chrome adapts to sidebar panel style. |
| Sidebar → Window/Card | Entity slides out of sidebar onto the canvas, expands to target size. |

---

## Color Philosophy

Domus is **warm and quiet**. Not sterile-white productivity tool. Not neon-dark hacker aesthetic.

- **Default theme:** Follows `prefers-color-scheme` (system preference). No forced default. User can override in settings.
- **Light theme:** Warm off-white surfaces (slight primary hue tint). High contrast text. The feel of good paper.
- **Dark theme:** Deep warm gray, not pure black. Slightly tinted toward primary hue. The feel of a well-lit room at night.
- **Accent scarcity:** The `primary` color appears on: focused entity borders, interactive element hover states, the agent glow. That's it. Color scarcity makes the agent's actions pop.
- **Spatial depth:** The canvas background is `surface-sunken` — slightly recessed. Windows and cards sit on top as `surface-raised`. Overlay surfaces (prompt bar, menus) use glassmorphism (blur + transparency) to float above the entity layer.

---

## Anti-Patterns

Things we explicitly will not do:

- **Gradients on surfaces.** Flat tonal backgrounds with shadow. Gradients are for marketing sites.
- **Blur on entity surfaces.** Glassmorphism is reserved for overlay surfaces (prompt bar, conversation panel, context menus, bottom sheet). Entity windows and cards use flat `surface-raised` backgrounds — they're multiplied across the canvas and must be cheap to render.
- **Icon-heavy navigation.** See P8 for the icon budget. If you're adding icons beyond what's listed there, stop.
- **Toast notifications.** Agent actions are communicated spatially (entity glow) and inline (chat chips). No floating toast stack.
- **Heavy skeleton screens.** Don't mimic the exact final layout with gray placeholder boxes. Transitive loading states use the warm shimmer indicator (see Entity Transitive States). It's minimal and abstract, not a structural preview.
- **Confetti, particles, or celebratory animations.** This is a workspace.
- **Custom scrollbars.** Use the OS default. We are a tool that lives inside the OS.
- **Pages or full-screen layouts.** Everything is an entity on a spatial canvas. If you're building a header + sidebar + main content layout, you're building the wrong thing.
- **Raw HTML form elements.** Always use the Domus form primitives (Input, Textarea, Select, Toggle, Checkbox, Button). Never render an unstyled `<input>` or `<select>`.

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

- [ ] UI chrome uses only three font sizes: `text-body` (14px), `text-label` (12px), `text-title` (16px).
- [ ] UI chrome uses only three font weights: 400 (body), 500 (label), 600 (title).
- [ ] Content areas (markdown, rich text) may use the extended content typography scale (h1 20px, h2 18px, h3 16px, code 13px mono).
- [ ] No custom font families — system font stack only (monospace stack for code).
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
- [ ] `backdrop-filter: blur()` is only used on overlay surfaces (prompt bar, conversation panel, context menus, bottom sheet, popovers). Never on entity windows or cards.
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

### Form Primitives Check

- [ ] All form inputs use Domus form primitives (Input, Textarea, Select, Toggle, Checkbox, Button). No raw `<input>`, `<select>`, or `<textarea>`.
- [ ] Buttons use one of the three variants: primary, ghost, or danger.
- [ ] All interactive elements implement the four states: hover, focus, active, disabled (per Interactive States Matrix).
- [ ] Form element heights are 36px (inputs, selects, buttons) or as specced (toggle 24px, checkbox 18px).

### Transitive States Check

- [ ] Entity defines a loading state if it fetches async content (shimmer indicator, not heavy skeleton).
- [ ] Entity defines an empty state with centered `on-surface-muted` text.
- [ ] Error states render inline within the entity, not as modals or toasts.
- [ ] Loading → content transition uses cross-fade over `duration-fast`.

### Feedback Check

- [ ] No toast notifications, snackbars, or floating banners.
- [ ] No modal dialogs for success/error feedback (modals only for destructive action confirmation).
- [ ] Errors are communicated inline (chat chips or entity state).
- [ ] The agent glow is not used for anything other than agent-origin entity changes.

### Chrome Check

- [ ] No new icons beyond the budget: app icons in entity headers, sidebar app icons, window controls, chat send button, context menu icons.
- [ ] No toolbar or navigation bar added to the component.
- [ ] No tabs or nested navigation within a window.
- [ ] One entity = one window = one view.

### Accessibility Check

- [ ] `prefers-reduced-motion` handled (see Motion Check).
- [ ] `prefers-color-scheme` respected via the token system (light/dark tokens auto-switch).
- [ ] Interactive elements have visible focus states using `primary` at 30% opacity.
- [ ] Text contrast meets WCAG AA against its background surface token.
- [ ] No `user-select: none` on content the user might want to copy.
