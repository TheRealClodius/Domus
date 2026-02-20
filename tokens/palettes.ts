// Pure functions: seed values → OKLCH color strings for light + dark themes.
// No runtime CSS dependency — runs in Node or browser.

import {
	ACCENT_CHROMA,
	ACCENT_HUES,
	CHROMA,
	DEFAULT_CHROMA_SCALE,
	DEFAULT_SCHEME_VARIANT,
	DEFAULT_SEED_HUE,
	ELEVATION_CHROMA_BOOST,
	EXPRESSIVE_SECONDARY_OFFSET,
	ROLE_HUES,
	type SchemeVariant,
	TERTIARY_HUE_OFFSET,
} from './seeds'

export interface PaletteParams {
	/** Primary accent hue (0-360), default 264 (purple) */
	seedHue?: number
	/** Chroma multiplier (0.5-2.0), default 1.0 */
	chromaScale?: number
	/** M3-inspired scheme variant */
	schemeVariant?: SchemeVariant
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

/** Surface hue IS the seed hue. At C≈0.01, any hue is subtle. */
function surfaceHue(seedHue: number): number {
	return seedHue
}

/** Chroma boost per surface elevation level — higher surfaces get more chroma */
function surfChromaForLevel(baseSurfC: number, level: string): number {
	const boost = ELEVATION_CHROMA_BOOST[level] ?? 0
	return baseSurfC + boost
}

/** Gaussian chroma curve — peak at L=0.5, tapers toward 0 and 1.
 *  Useful for ensuring chroma doesn't blow out at extreme lightness. */
export function chromaAtLightness(L: number, peakChroma: number, sigma = 0.3): number {
	const gaussian = Math.exp(-0.5 * ((L - 0.5) / sigma) ** 2)
	return Math.max(peakChroma * gaussian, 0.005)
}

// ── Scheme variant resolver ──

interface ResolvedScheme {
	primaryC: number
	secondaryOffset: number
	secondaryC: number
	tertiaryOffset: number
	tertiaryC: number
	surfaceChromaMult: number
}

function resolveScheme(chromaScale: number, variant: SchemeVariant): ResolvedScheme {
	const s = chromaScale
	switch (variant) {
		case 'vibrant':
			return {
				primaryC: scaleChroma(0.22, s * 1.5),
				secondaryOffset: 0,
				secondaryC: scaleChroma(0.1, s * 1.5),
				tertiaryOffset: TERTIARY_HUE_OFFSET,
				tertiaryC: scaleChroma(0.15, s * 1.5),
				surfaceChromaMult: 1.3,
			}
		case 'muted':
			return {
				primaryC: scaleChroma(0.22, s * 0.6),
				secondaryOffset: 0,
				secondaryC: scaleChroma(0.1, s * 0.6),
				tertiaryOffset: TERTIARY_HUE_OFFSET,
				tertiaryC: scaleChroma(0.15, s * 0.6),
				surfaceChromaMult: 0.5,
			}
		case 'expressive':
			return {
				primaryC: scaleChroma(0.22, s * 1.2),
				secondaryOffset: EXPRESSIVE_SECONDARY_OFFSET,
				secondaryC: scaleChroma(0.12, s * 1.2),
				tertiaryOffset: TERTIARY_HUE_OFFSET,
				tertiaryC: scaleChroma(0.18, s * 1.2),
				surfaceChromaMult: 1.2,
			}
		case 'monochrome':
			return {
				primaryC: 0.005,
				secondaryOffset: 0,
				secondaryC: 0.005,
				tertiaryOffset: 0,
				tertiaryC: 0.005,
				surfaceChromaMult: 0,
			}
		default:
			return {
				primaryC: scaleChroma(0.22, s),
				secondaryOffset: 0,
				secondaryC: scaleChroma(0.1, s),
				tertiaryOffset: TERTIARY_HUE_OFFSET,
				tertiaryC: scaleChroma(0.15, s),
				surfaceChromaMult: 1.0,
			}
	}
}

function resolveParams(params?: PaletteParams) {
	const seedHue = params?.seedHue ?? DEFAULT_SEED_HUE
	const chromaScale = params?.chromaScale ?? DEFAULT_CHROMA_SCALE
	const variant = params?.schemeVariant ?? DEFAULT_SCHEME_VARIANT
	const scheme = resolveScheme(chromaScale, variant)

	const surfH = surfaceHue(seedHue)
	const primaryH = seedHue
	const secondaryH = wrapHue(seedHue + scheme.secondaryOffset)
	const tertiaryH = wrapHue(seedHue + scheme.tertiaryOffset)

	const baseSurfC = scaleChroma(CHROMA.surface, chromaScale * scheme.surfaceChromaMult)
	const nvC = scaleChroma(CHROMA.neutralVariant, chromaScale * scheme.surfaceChromaMult)
	const accentC = scaleChroma(ACCENT_CHROMA, chromaScale)

	return {
		seedHue,
		chromaScale,
		surfH,
		primaryH,
		secondaryH,
		tertiaryH,
		baseSurfC,
		nvC,
		scheme,
		accentC,
	}
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
	secondary: string
	'on-secondary': string
	'secondary-container': string
	'on-secondary-container': string
	tertiary: string
	'on-tertiary': string
	'tertiary-container': string
	'on-tertiary-container': string
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
	'secondary',
	'on-secondary',
	'secondary-container',
	'on-secondary-container',
	'tertiary',
	'on-tertiary',
	'tertiary-container',
	'on-tertiary-container',
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
	const { seedHue, surfH, primaryH, secondaryH, tertiaryH, baseSurfC, nvC, scheme, accentC } =
		resolveParams(params)
	return {
		'surface-lowest': oklch(1.0, surfChromaForLevel(baseSurfC, 'surface-lowest'), surfH),
		'surface-low': oklch(0.97, surfChromaForLevel(baseSurfC, 'surface-low'), surfH),
		'surface-bright': oklch(0.98, surfChromaForLevel(baseSurfC, 'surface-bright'), surfH),
		surface: oklch(0.955, surfChromaForLevel(baseSurfC, 'surface'), surfH),
		'surface-high': oklch(0.94, surfChromaForLevel(baseSurfC, 'surface-high'), surfH),
		'surface-highest': oklch(0.92, surfChromaForLevel(baseSurfC, 'surface-highest'), surfH),
		'surface-dim': oklch(0.9, surfChromaForLevel(baseSurfC, 'surface-dim'), surfH),
		'on-surface': oklch(0.18, baseSurfC, surfH),
		'on-surface-muted': oklch(0.45, baseSurfC, surfH),
		outline: oklch(0.75, nvC, surfH),
		'outline-variant': oklch(0.88, nvC, surfH),
		primary: oklch(0.56, scheme.primaryC, primaryH),
		'on-primary': oklch(0.99, 0, 0),
		'primary-container': oklch(0.9, 0.06, primaryH),
		'on-primary-container': oklch(0.2, 0.12, primaryH),
		secondary: oklch(0.6, scheme.secondaryC, secondaryH),
		'on-secondary': oklch(0.99, 0, 0),
		'secondary-container': oklch(0.92, 0.04, secondaryH),
		'on-secondary-container': oklch(0.25, 0.08, secondaryH),
		tertiary: oklch(0.58, scheme.tertiaryC, tertiaryH),
		'on-tertiary': oklch(0.99, 0, 0),
		'tertiary-container': oklch(0.91, 0.05, tertiaryH),
		'on-tertiary-container': oklch(0.22, 0.1, tertiaryH),
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
	const { seedHue, surfH, primaryH, secondaryH, tertiaryH, baseSurfC, nvC, scheme, accentC } =
		resolveParams(params)
	return {
		'surface-lowest': oklch(0.24, surfChromaForLevel(baseSurfC, 'surface-lowest'), surfH),
		'surface-low': oklch(0.2, surfChromaForLevel(baseSurfC, 'surface-low'), surfH),
		'surface-bright': oklch(0.26, surfChromaForLevel(baseSurfC, 'surface-bright'), surfH),
		surface: oklch(0.18, surfChromaForLevel(baseSurfC, 'surface'), surfH),
		'surface-high': oklch(0.16, surfChromaForLevel(baseSurfC, 'surface-high'), surfH),
		'surface-highest': oklch(0.15, surfChromaForLevel(baseSurfC, 'surface-highest'), surfH),
		'surface-dim': oklch(0.14, surfChromaForLevel(baseSurfC, 'surface-dim'), surfH),
		'on-surface': oklch(0.93, baseSurfC, surfH),
		'on-surface-muted': oklch(0.6, baseSurfC, surfH),
		outline: oklch(0.4, nvC, surfH),
		'outline-variant': oklch(0.3, nvC, surfH),
		primary: oklch(0.65, scheme.primaryC, primaryH),
		'on-primary': oklch(0.99, 0, 0),
		'primary-container': oklch(0.3, 0.1, primaryH),
		'on-primary-container': oklch(0.9, 0.06, primaryH),
		secondary: oklch(0.72, scheme.secondaryC, secondaryH),
		'on-secondary': oklch(0.99, 0, 0),
		'secondary-container': oklch(0.28, 0.06, secondaryH),
		'on-secondary-container': oklch(0.88, 0.04, secondaryH),
		tertiary: oklch(0.7, scheme.tertiaryC, tertiaryH),
		'on-tertiary': oklch(0.99, 0, 0),
		'tertiary-container': oklch(0.29, 0.08, tertiaryH),
		'on-tertiary-container': oklch(0.89, 0.05, tertiaryH),
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
	const { surfH, primaryH, baseSurfC, scheme } = resolveParams(params)
	const primaryC = scheme.primaryC
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
		tokens['--pill-base'] = oklch(0.96, baseSurfC, surfH)
		tokens['--pill-base-hover'] = oklch(0.98, baseSurfC, surfH)
		// Pill secondary/active use a shifted hue
		const pillSecHue = wrapHue(230 + (primaryH - DEFAULT_SEED_HUE))
		tokens['--pill-secondary'] = oklch(0.9, baseSurfC, pillSecHue)
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
		tokens['--surface-glass'] = oklchA(0.975, baseSurfC, surfH, 0.7)
		tokens['--surface-glass-heavy'] = oklchA(0.975, baseSurfC, surfH, 0.85)

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
		tokens['--surface-glass'] = oklchA(0.18, baseSurfC, surfH, 0.7)
		tokens['--surface-glass-heavy'] = oklchA(0.18, baseSurfC, surfH, 0.85)

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
