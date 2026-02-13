# Domus — Design Direction

How Domus looks, feels, and communicates. This document governs every visual decision.

---

## Core Premise

Domus is an environment that responds to you. The design must make the agent's actions feel **spatial** (things appear, move, glow, fade) rather than **textual** (chat bubble, chat bubble, chat bubble). The UI is a room, not a feed.

The agent is not a chatbot that happens to have a canvas. The canvas IS the interface. Chat is one input surface among many.

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

  --shadow-raised: 0 1px 3px oklch(0 0 0 / 0.08), 0 1px 2px oklch(0 0 0 / 0.06);
  --shadow-window: 0 4px 12px oklch(0 0 0 / 0.1), 0 1px 4px oklch(0 0 0 / 0.06);
  --shadow-floating: 0 8px 24px oklch(0 0 0 / 0.12), 0 2px 8px oklch(0 0 0 / 0.08);
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

  --shadow-raised: 0 1px 3px oklch(0 0 0 / 0.2), 0 1px 2px oklch(0 0 0 / 0.15);
  --shadow-window: 0 4px 12px oklch(0 0 0 / 0.25), 0 1px 4px oklch(0 0 0 / 0.15);
  --shadow-floating: 0 8px 24px oklch(0 0 0 / 0.3), 0 2px 8px oklch(0 0 0 / 0.2);
}
```

Then in components: `bg-surface`, `text-on-surface`, `border-outline`, `shadow-window`. Zero magic strings.

### Typography

One typeface. Two weights. Three sizes that matter.

| Token | Size | Weight | Use |
|---|---|---|---|
| `text-body` | 0.875rem / 14px | 400 | Everything |
| `text-label` | 0.75rem / 12px | 500 | Metadata, timestamps, entity type badges |
| `text-title` | 1.0rem / 16px | 600 | Window titles, section headers |

The typeface: system font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', ...`). We are not a marketing site. We are a tool. The OS font is the right font.

No `text-xl`. No `text-3xl`. If you need a size that isn't in this table, the design is wrong.

### Spacing

4px base unit. Everything is a multiple of 4.

| Token | Value | Use |
|---|---|---|
| `gap-1` | 4px | Tight: icon-to-label |
| `gap-2` | 8px | Default: between elements |
| `gap-3` | 12px | Comfortable: between groups |
| `gap-4` | 16px | Sections within a window |
| `gap-6` | 24px | Between major regions |

Padding inside windows/cards: `p-4` (16px). This is not negotiable. Consistent internal padding is what makes the UI feel cohesive.

### Radius

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 6px | Buttons, inputs, chips |
| `rounded-md` | 12px | Cards, dropdowns, popovers |
| `rounded-lg` | 16px | Windows |

Domus is soft but not bubbly. Everything has radius. Nothing is a circle (except avatars).

---

## Visual Feedback Vocabulary

The agent acts on the world. The user must see those actions *spatially*, not just read about them in chat. Every agent action has a visual consequence.

### Entity States

| State | Visual Treatment | Duration |
|---|---|---|
| **Agent-creating** | Entity fades in from 0% opacity with a subtle scale-up (0.97 → 1.0). Warm glow on the border (`shadow-agent`). | 400ms ease-out |
| **Agent-updating** | Brief pulse on the changed region — a 1px highlight sweep across the updated content area. | 300ms |
| **Agent-moving** | Smooth position transition (`transition: transform 400ms ease-out`). The entity glides, it doesn't teleport. | 400ms |
| **User-dragging** | No transition. Direct 1:1 pointer tracking. Slight shadow elevation increase during drag. | Immediate |
| **Focused** | Elevated shadow (`shadow-floating`). Subtle border highlight at `primary` color, 30% opacity. Other windows dim slightly (opacity 0.85). | 200ms |
| **Archiving** | Fade out + scale down (1.0 → 0.95, opacity → 0). Remove from DOM after animation. | 300ms ease-in |

### The Agent Glow

When the agent creates or significantly updates an entity, it gets a **warm glow** — a soft colored shadow that fades over a few seconds. This is the single most important visual signal in Domus. It answers: "what did the agent just do?"

```css
.entity-agent-glow {
  box-shadow:
    0 0 0 1px var(--color-agent / 0.3),
    0 0 20px 4px var(--color-agent / 0.15),
    var(--shadow-window);
  transition: box-shadow 2s ease-out;
}

.entity-agent-glow-fading {
  box-shadow: var(--shadow-window);
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
┌─────────────────────────────────────┐  ← rounded-lg, shadow-window
│  ◉  Title                     ─ □ ✕ │  ← 40px title bar, text-title
├─────────────────────────────────────┤  ← 1px border-outline
│                                     │
│   [App content, p-4 internal]       │  ← bg-surface-raised
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- Title bar: 40px height. App icon (16px) + title text. Window controls on the right: minimize (collapse to title bar), maximize (not fullscreen — expand to fill available canvas), close (archive entity).
- Drag: entire title bar is the drag handle.
- Resize: corner and edge handles, 8px hit area, cursor changes.
- No tab system. No nested navigation within windows. One entity = one window = one view. If you need tabs, you need multiple entities.

### Cards

Cards are compact, no-chrome entity representations for the canvas.

```
┌───────────────────────┐  ← rounded-md, shadow-raised
│                       │
│  [Content, p-3]       │  ← bg-surface-raised
│                       │
│  type · timestamp     │  ← text-label, text-on-surface-muted
└───────────────────────┘
```

- No title bar. No window controls.
- Click to expand into a window (presentation change: 'card' → 'window').
- Drag the entire card to reposition.
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

---

## Motion Principles

1. **Agent actions are animated. User actions are immediate.** When the agent creates a window, it fades in. When the user drags a window, it tracks the pointer with zero delay. This distinction makes the agent feel like a collaborator and the UI feel responsive.

2. **Duration scale: 200-400ms.** Nothing faster (imperceptible). Nothing slower (sluggish). Exception: the agent glow fade-out at 2s — this is deliberately slow because it's ambient, not interactive.

3. **Easing: ease-out for entrances, ease-in for exits.** Things arrive decelerating (confident). Things leave accelerating (getting out of the way).

4. **No spring physics.** We are not a mobile app. CSS transitions with `ease-out` curves. Simple, predictable, debuggable.

5. **Reduce motion: respect `prefers-reduced-motion`.** All animations → instant. Glow → static border highlight. Transitions → immediate state changes.

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
