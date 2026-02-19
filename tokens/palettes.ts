// Pure functions: seed values → OKLCH color strings for light + dark themes.
// No runtime CSS dependency — runs in Node or browser.

import {
	ACCENT_CHROMA,
	ACCENT_HUES,
	CHROMA,
	DEFAULT_CHROMA_SCALE,
	DEFAULT_SEED_HUE,
	DEFAULT_SURFACE_HUE,
	ROLE_HUES,
} from './seeds'

export interface PaletteParams {
	/** Primary accent hue (0-360), default 264 (purple) */
	seedHue?: number
	/** Chroma multiplier (0.5-2.0), default 1.0 */
	chromaScale?: number
}

function oklch(l: number, c: number, h: number): string {
	return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`
}

/** OKLCH with alpha channel for shadows/glass */
function oklchA(l: number, c: number, h: number, a: number): string {
	return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h} / ${a})`
}

/** Normalize hue to 0-360 */
function wrapHue(h: number): number {
	return ((h % 360) + 360) % 360
}

/** Clamp chroma to a floor to prevent zero-saturation values */
function scaleChroma(base: number, scale: number, min = 0.005): number {
	return Math.max(base * scale, min)
}

/** Shift a hue by the delta between user seed and default seed */
function shiftHue(baseHue: number, seedHue: number): number {
	return wrapHue(baseHue + (seedHue - DEFAULT_SEED_HUE))
}

/** Shift the surface hue: proportional to the delta from default seed */
function surfaceHue(seedHue: number): number {
	return wrapHue(DEFAULT_SURFACE_HUE + (seedHue - DEFAULT_SEED_HUE))
}

function resolveParams(params?: PaletteParams) {
	const seedHue = params?.seedHue ?? DEFAULT_SEED_HUE
	const chromaScale = params?.chromaScale ?? DEFAULT_CHROMA_SCALE
	const surfH = surfaceHue(seedHue)
	const primaryH = seedHue
	const surfC = scaleChroma(CHROMA.surface, chromaScale)
	const primaryC = scaleChroma(0.22, chromaScale) // CSS uses 0.22, not seeds.ts 0.12
	const accentC = scaleChroma(ACCENT_CHROMA, chromaScale)
	return { seedHue, chromaScale, surfH, primaryH, surfC, primaryC, accentC }
}

export interface ThemeRoles {
	'surface-lowest': string
	'surface-low': string
	'surface-bright': string
	surface: string
	'surface-high': string
	'surface-highest': string
	'surface-dim': string
	'on-surface': string
	'on-surface-muted': string
	outline: string
	'outline-variant': string
	primary: string
	'on-primary': string
	'primary-container': string
	'on-primary-container': string
	agent: string
	'agent-container': string
	'on-agent-container': string
	error: string
	'error-container': string
	'on-error-container': string
	'accent-1': string
	'accent-2': string
	'accent-3': string
	'accent-4': string
	'accent-5': string
	'accent-6': string
}

/** All semantic roles that must be present in every palette */
export const REQUIRED_ROLES: ReadonlyArray<keyof ThemeRoles> = [
	'surface-lowest',
	'surface-low',
	'surface-bright',
	'surface',
	'surface-high',
	'surface-highest',
	'surface-dim',
	'on-surface',
	'on-surface-muted',
	'outline',
	'outline-variant',
	'primary',
	'on-primary',
	'primary-container',
	'on-primary-container',
	'agent',
	'agent-container',
	'on-agent-container',
	'error',
	'error-container',
	'on-error-container',
	'accent-1',
	'accent-2',
	'accent-3',
	'accent-4',
	'accent-5',
	'accent-6',
]

export function generateLightPalette(params?: PaletteParams): ThemeRoles {
	const { seedHue, surfH, primaryH, surfC, primaryC, accentC } = resolveParams(params)
	return {
		'surface-lowest': oklch(1.0, surfC, surfH),
		'surface-low': oklch(0.97, surfC, surfH),
		'surface-bright': oklch(0.98, surfC, surfH),
		surface: oklch(0.955, surfC, surfH),
		'surface-high': oklch(0.94, surfC, surfH),
		'surface-highest': oklch(0.92, surfC, surfH),
		'surface-dim': oklch(0.9, surfC, surfH),
		'on-surface': oklch(0.18, surfC, surfH),
		'on-surface-muted': oklch(0.45, surfC, surfH),
		outline: oklch(0.75, surfC * 2, surfH),
		'outline-variant': oklch(0.88, surfC * 2, surfH),
		primary: oklch(0.56, primaryC, primaryH),
		'on-primary': oklch(0.99, 0, 0),
		'primary-container': oklch(0.9, 0.06, primaryH),
		'on-primary-container': oklch(0.2, 0.12, primaryH),
		agent: oklch(0.65, CHROMA.agent, ROLE_HUES.agent),
		'agent-container': oklch(0.9, 0.06, ROLE_HUES.agent),
		'on-agent-container': oklch(0.2, 0.12, ROLE_HUES.agent),
		error: oklch(0.53, CHROMA.error, ROLE_HUES.error),
		'error-container': oklch(0.9, 0.06, ROLE_HUES.error),
		'on-error-container': oklch(0.2, 0.12, ROLE_HUES.error),
		'accent-1': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[1], seedHue))),
		'accent-2': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[2], seedHue))),
		'accent-3': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[3], seedHue))),
		'accent-4': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[4], seedHue))),
		'accent-5': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[5], seedHue))),
		'accent-6': oklch(0.6, accentC, wrapHue(shiftHue(ACCENT_HUES[6], seedHue))),
	}
}

export function generateDarkPalette(params?: PaletteParams): ThemeRoles {
	const { seedHue, surfH, primaryH, surfC, primaryC, accentC } = resolveParams(params)
	return {
		'surface-lowest': oklch(0.24, surfC, surfH),
		'surface-low': oklch(0.2, surfC, surfH),
		'surface-bright': oklch(0.26, surfC, surfH),
		surface: oklch(0.18, surfC, surfH),
		'surface-high': oklch(0.16, surfC, surfH),
		'surface-highest': oklch(0.15, surfC, surfH),
		'surface-dim': oklch(0.14, surfC, surfH),
		'on-surface': oklch(0.93, surfC, surfH),
		'on-surface-muted': oklch(0.6, surfC, surfH),
		outline: oklch(0.4, surfC * 2, surfH),
		'outline-variant': oklch(0.3, surfC * 2, surfH),
		primary: oklch(0.65, primaryC, primaryH),
		'on-primary': oklch(0.99, 0, 0),
		'primary-container': oklch(0.3, 0.1, primaryH),
		'on-primary-container': oklch(0.9, 0.06, primaryH),
		agent: oklch(0.7, CHROMA.agent, ROLE_HUES.agent),
		'agent-container': oklch(0.3, 0.1, ROLE_HUES.agent),
		'on-agent-container': oklch(0.9, 0.06, ROLE_HUES.agent),
		error: oklch(0.6, CHROMA.error, ROLE_HUES.error),
		'error-container': oklch(0.3, 0.1, ROLE_HUES.error),
		'on-error-container': oklch(0.9, 0.06, ROLE_HUES.error),
		'accent-1': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[1], seedHue))),
		'accent-2': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[2], seedHue))),
		'accent-3': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[3], seedHue))),
		'accent-4': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[4], seedHue))),
		'accent-5': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[5], seedHue))),
		'accent-6': oklch(0.72, accentC, wrapHue(shiftHue(ACCENT_HUES[6], seedHue))),
	}
}

/** Extended tokens covering all CSS custom properties with embedded hue/chroma.
 *  Returns a flat Record<string, string> for direct application via setProperty(). */
export function generateExtendedTokens(
	theme: 'light' | 'dark',
	params?: PaletteParams,
): Record<string, string> {
	const { surfH, primaryH, surfC, primaryC } = resolveParams(params)
	const palette = theme === 'light' ? generateLightPalette(params) : generateDarkPalette(params)

	// Start with all ThemeRoles
	const tokens: Record<string, string> = {}
	for (const [key, value] of Object.entries(palette)) {
		tokens[`--${key}`] = value
	}

	// Chat sidebar — shifted from default 260 by same delta as primary
	const chatSidebarHue = wrapHue(260 + (primaryH - DEFAULT_SEED_HUE))

	if (theme === 'light') {
		// Shadows — surface-hue based
		tokens['--shadow-resting'] =
			`0 1px 3px 0 ${oklchA(0.1, 0.015, surfH, 0.07)}, 0 1px 2px -1px ${oklchA(0.1, 0.015, surfH, 0.07)}`
		tokens['--shadow-elevated'] =
			`0 4px 12px 0 ${oklchA(0.1, 0.015, surfH, 0.1)}, 0 2px 4px -2px ${oklchA(0.1, 0.015, surfH, 0.07)}`
		tokens['--shadow-focused'] =
			`0 8px 24px 0 ${oklchA(0.1, 0.015, surfH, 0.12)}, 0 4px 8px -4px ${oklchA(0.1, 0.015, surfH, 0.1)}`
		tokens['--shadow-overlay'] =
			`0 16px 48px 0 ${oklchA(0.1, 0.015, surfH, 0.14)}, 0 8px 16px -8px ${oklchA(0.1, 0.015, surfH, 0.12)}`
		tokens['--shadow-card'] = `0 1px 2px 0 ${oklchA(0.1, 0.015, surfH, 0.28)}`
		tokens['--shadow-window'] = `0 4px 20px 0 ${oklchA(0.55, 0.02, surfH, 0.3)}`
		tokens['--shadow-dragging'] =
			`0 24px 64px 0 ${oklchA(0.1, 0.015, surfH, 0.16)}, 0 12px 24px -12px ${oklchA(0.1, 0.015, surfH, 0.12)}`

		// Focus ring & glass — primary-hue based
		tokens['--shadow-focus-ring'] = `0 0 0 3px ${oklchA(0.56, primaryC, primaryH, 0.3)}`
		tokens['--shadow-glass-inset'] =
			`inset 0 1px 1px rgb(255 255 255 / 0.05), inset 0.5px 0 0.5px ${oklchA(0.56, primaryC, primaryH, 0.1)}, inset -0.5px 0 0.5px ${oklchA(0.56, primaryC, primaryH, 0.14)}`

		// Pills — surface hue
		tokens['--pill-base'] = oklch(0.96, surfC, surfH)
		tokens['--pill-base-hover'] = oklch(0.98, surfC, surfH)
		// Pill secondary/active use a shifted hue
		const pillSecHue = wrapHue(230 + (primaryH - DEFAULT_SEED_HUE))
		tokens['--pill-secondary'] = oklch(0.9, surfC, pillSecHue)
		tokens['--pill-secondary-hover'] = oklch(0.86, 0.015, pillSecHue)
		tokens['--pill-active'] = oklchA(0.5, 0.18, wrapHue(250 + (primaryH - DEFAULT_SEED_HUE)), 0.6)
		tokens['--pill-active-hover'] = oklchA(
			0.5,
			0.18,
			wrapHue(250 + (primaryH - DEFAULT_SEED_HUE)),
			0.9,
		)

		// Chrome handles — keep at 230 (UI chrome, not brand)
		tokens['--chrome-handle'] = oklch(0.72, 0.01, 230)
		tokens['--chrome-handle-hover'] = oklch(0.35, 0.01, 230)

		// Chips
		tokens['--chip-loading-from'] = oklchA(0.7, 0.03, 230, 0.53)
		tokens['--chip-loading-to'] = oklchA(0.78, 0.05, ROLE_HUES.error, 0.53)
		tokens['--chip-error-bg'] = oklchA(0.9, 0.08, 85, 0.12)
		tokens['--chip-document'] = oklch(0.72, 0.1, 210)
		tokens['--chip-document-shadow'] = `0 2px 8px ${oklchA(0.45, 0.15, 210, 0.25)}`

		// Glass — surface hue
		tokens['--surface-glass'] = oklchA(0.975, surfC, surfH, 0.7)
		tokens['--surface-glass-heavy'] = oklchA(0.975, surfC, surfH, 0.85)

		// Chat sidebar
		tokens['--surface-chat-sidebar'] = oklchA(0.82, 0.06, chatSidebarHue, 0.65)
	} else {
		// Dark theme shadows
		tokens['--shadow-resting'] =
			`0 1px 3px 0 ${oklchA(0.04, 0.01, surfH, 0.25)}, 0 1px 2px -1px ${oklchA(0.04, 0.01, surfH, 0.25)}`
		tokens['--shadow-elevated'] =
			`0 4px 12px 0 ${oklchA(0.04, 0.01, surfH, 0.35)}, 0 2px 4px -2px ${oklchA(0.04, 0.01, surfH, 0.25)}`
		tokens['--shadow-focused'] =
			`0 8px 24px 0 ${oklchA(0.04, 0.01, surfH, 0.38)}, 0 4px 8px -4px ${oklchA(0.04, 0.01, surfH, 0.32)}`
		tokens['--shadow-overlay'] =
			`0 16px 48px 0 ${oklchA(0.04, 0.01, surfH, 0.45)}, 0 8px 16px -8px ${oklchA(0.04, 0.01, surfH, 0.38)}`
		tokens['--shadow-card'] = `0 1px 2px 0 ${oklchA(0.04, 0.01, surfH, 0.55)}`
		tokens['--shadow-window'] = `0 4px 20px 0 ${oklchA(0.04, 0.01, surfH, 0.65)}`
		tokens['--shadow-dragging'] =
			`0 24px 64px 0 ${oklchA(0.04, 0.01, surfH, 0.5)}, 0 12px 24px -12px ${oklchA(0.04, 0.01, surfH, 0.38)}`

		// Focus ring & glass — primary-hue based (dark lightness values)
		tokens['--shadow-focus-ring'] = `0 0 0 3px ${oklchA(0.65, primaryC, primaryH, 0.3)}`
		tokens['--shadow-glass-inset'] =
			`inset 0 1px 1px rgb(255 255 255 / 0.03), inset 0.5px 0 0.5px ${oklchA(0.65, primaryC, primaryH, 0.08)}, inset -0.5px 0 0.5px ${oklchA(0.65, primaryC, primaryH, 0.1)}`

		// Pills — dark surface hue
		tokens['--pill-base'] = oklch(0.28, 0.015, surfH)
		tokens['--pill-base-hover'] = oklch(0.32, 0.015, surfH)
		const pillSecHue = wrapHue(230 + (primaryH - DEFAULT_SEED_HUE))
		tokens['--pill-secondary'] = oklch(0.28, 0.01, pillSecHue)
		tokens['--pill-secondary-hover'] = oklch(0.32, 0.015, pillSecHue)
		tokens['--pill-active'] = oklchA(0.6, 0.18, wrapHue(250 + (primaryH - DEFAULT_SEED_HUE)), 0.6)
		tokens['--pill-active-hover'] = oklchA(
			0.6,
			0.18,
			wrapHue(250 + (primaryH - DEFAULT_SEED_HUE)),
			0.9,
		)

		// Chrome handles — keep at 230
		tokens['--chrome-handle'] = oklch(0.45, 0.01, 230)
		tokens['--chrome-handle-hover'] = oklch(0.7, 0.01, 230)

		// Chips
		tokens['--chip-loading-from'] = oklchA(0.35, 0.03, 230, 0.6)
		tokens['--chip-loading-to'] = oklchA(0.4, 0.05, ROLE_HUES.error, 0.6)
		tokens['--chip-error-bg'] = oklchA(0.3, 0.08, 85, 0.15)
		tokens['--chip-document'] = oklch(0.65, 0.1, 210)
		tokens['--chip-document-shadow'] = `0 2px 8px ${oklchA(0.3, 0.15, 210, 0.3)}`

		// Glass — dark surface hue
		tokens['--surface-glass'] = oklchA(0.18, surfC, surfH, 0.7)
		tokens['--surface-glass-heavy'] = oklchA(0.18, surfC, surfH, 0.85)

		// Chat sidebar
		tokens['--surface-chat-sidebar'] = oklchA(0.25, 0.06, chatSidebarHue, 0.65)
	}

	// Agent glow — always fixed
	const agentL = theme === 'light' ? 0.65 : 0.7
	tokens['--shadow-agent-glow'] =
		`0 0 0 3px ${oklchA(agentL, CHROMA.agent, ROLE_HUES.agent, 0.4)}, 0 0 24px 4px ${oklchA(agentL, CHROMA.agent, ROLE_HUES.agent, 0.15)}`

	// Close control — always error-hue based
	if (theme === 'light') {
		tokens['--control-close-from'] = oklch(0.35, 0.15, ROLE_HUES.error)
		tokens['--control-close-to'] = oklch(0.55, 0.22, ROLE_HUES.error)
	} else {
		tokens['--control-close-from'] = oklch(0.4, 0.15, ROLE_HUES.error)
		tokens['--control-close-to'] = oklch(0.6, 0.22, ROLE_HUES.error)
	}
	tokens['--control-close-dot'] = oklch(0.99, 0, 0)

	// Overlay scrim — theme-neutral
	tokens['--overlay-scrim'] = theme === 'light' ? 'oklch(0 0 0 / 0.45)' : 'oklch(0 0 0 / 0.6)'

	return tokens
}
