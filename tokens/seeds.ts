// Design system seed values — all generated tokens trace back to these constants.
// See docs/DESIGN-DIRECTION.md for rationale.

/** Default seed hue — purple accent, matches tokens.css --primary */
export const DEFAULT_SEED_HUE = 264

/** Default surface hue — warm amber, matches tokens.css surfaces */
export const DEFAULT_SURFACE_HUE = 55

/** Default chroma multiplier (1.0 = no change) */
export const DEFAULT_CHROMA_SCALE = 1.0

/** Brand hues in OKLCH hue degrees */
export const SEED_HUES = {
	primary: 55, // warm amber/gold (legacy — surfaces use this)
	secondary: 230, // cool blue (reserved, used sparingly)
} as const

/** Role-specific hue overrides — sacred, never change with user seed */
export const ROLE_HUES = {
	agent: 40, // warm orange — the glow
	error: 25, // red-orange
} as const

/** Categorical accent hues — 6 distributed around OKLCH wheel, avoiding primary/agent/error */
export const ACCENT_HUES = {
	1: 330, // rose/magenta
	2: 160, // teal/mint
	3: 270, // violet
	4: 90, // lime
	5: 200, // sky blue
	6: 0, // red (clear of agent@40 and error@25)
} as const

/** Accent chroma — moderate, below primary's 0.12 */
export const ACCENT_CHROMA = 0.1 as const

/** Chroma (saturation) per role in OKLCH 0–1 range */
export const CHROMA = {
	surface: 0.01, // barely warm — perceptible but quiet
	primary: 0.12, // strong enough for accent
	agent: 0.14, // warmest element in the system
	error: 0.18, // red needs higher chroma for legibility
} as const

/** Typography — system font stack, three sizes, two weights */
export const TYPE = {
	family: {
		sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
	},
	size: {
		label: '0.75rem', // 12px — metadata, timestamps, type badges
		body: '0.875rem', // 14px — default for all UI chrome
		title: '1.125rem', // 18px — window titles, section headers
	},
	weight: {
		normal: 400,
		medium: 500,
	},
	leading: '1.5',
} as const

/** Spacing base unit — all spacing is multiples of this */
export const SPACING_BASE = 4 // px

/** Border radius — soft but not bubbly */
export const RADIUS = {
	small: '6px', // buttons, inputs, chips
	medium: '10px', // cards, dropdowns
	large: '14px', // windows, bottom sheets
	xlarge: '20px', // prompt bar pill, bottom sheets
} as const

/** Backdrop blur tiers — glassmorphism for overlay surfaces */
export const BLUR = {
	subtle: '4px', // light frosting on buttons/chips
	medium: '12px', // prompt bar, conversation panel
	heavy: '20px', // bottom sheet, context menu
} as const

/** Shadow levels — sole depth cue for entities */
export const SHADOW = {
	resting: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
	elevated: '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
} as const

/** Extended shadow levels — focused, overlay, dragging */
export const SHADOW_FOCUSED = '0 8px 24px 0 rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.08)'
export const SHADOW_OVERLAY = '0 16px 48px 0 rgb(0 0 0 / 0.12), 0 8px 16px -8px rgb(0 0 0 / 0.10)'
export const SHADOW_DRAGGING =
	'0 24px 64px 0 rgb(0 0 0 / 0.14), 0 12px 24px -12px rgb(0 0 0 / 0.10)'

/** Dark theme shadows — stronger for perceptibility */
export const SHADOW_DARK = {
	resting: '0 1px 3px 0 rgb(0 0 0 / 0.20), 0 1px 2px -1px rgb(0 0 0 / 0.20)',
	elevated: '0 4px 12px 0 rgb(0 0 0 / 0.30), 0 2px 4px -2px rgb(0 0 0 / 0.20)',
} as const

/** Dark extended shadow levels */
export const SHADOW_FOCUSED_DARK =
	'0 8px 24px 0 rgb(0 0 0 / 0.30), 0 4px 8px -4px rgb(0 0 0 / 0.25)'
export const SHADOW_OVERLAY_DARK =
	'0 16px 48px 0 rgb(0 0 0 / 0.35), 0 8px 16px -8px rgb(0 0 0 / 0.30)'
export const SHADOW_DRAGGING_DARK =
	'0 24px 64px 0 rgb(0 0 0 / 0.40), 0 12px 24px -12px rgb(0 0 0 / 0.30)'

/** Agent glow — warm oklch halo */
export const SHADOW_AGENT_GLOW =
	'0 0 0 3px oklch(0.65 0.14 40 / 0.4), 0 0 24px 4px oklch(0.65 0.14 40 / 0.15)'

/** Focus ring — primary oklch ring */
export const SHADOW_FOCUS_RING = '0 0 0 3px oklch(0.55 0.12 55 / 0.3)'
