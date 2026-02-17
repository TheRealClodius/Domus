// Pure functions: seed values → OKLCH color strings for light + dark themes.
// No runtime CSS dependency — runs in Node or browser.

import { ACCENT_CHROMA, ACCENT_HUES, CHROMA, ROLE_HUES, SEED_HUES } from './seeds'

function oklch(l: number, c: number, h: number): string {
	return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h})`
}

export interface ThemeRoles {
	surface: string
	'surface-raised': string
	'surface-sunken': string
	'on-surface': string
	'on-surface-muted': string
	outline: string
	primary: string
	'on-primary': string
	agent: string
	error: string
	'accent-1': string
	'accent-2': string
	'accent-3': string
	'accent-4': string
	'accent-5': string
	'accent-6': string
}

/** All semantic roles that must be present in every palette */
export const REQUIRED_ROLES: ReadonlyArray<keyof ThemeRoles> = [
	'surface',
	'surface-raised',
	'surface-sunken',
	'on-surface',
	'on-surface-muted',
	'outline',
	'primary',
	'on-primary',
	'agent',
	'error',
	'accent-1',
	'accent-2',
	'accent-3',
	'accent-4',
	'accent-5',
	'accent-6',
]

export function generateLightPalette(): ThemeRoles {
	const h = SEED_HUES.primary
	return {
		surface: oklch(0.975, CHROMA.surface, h),
		'surface-raised': oklch(0.99, CHROMA.surface, h),
		'surface-sunken': oklch(0.955, CHROMA.surface, h),
		'on-surface': oklch(0.18, CHROMA.surface, h),
		'on-surface-muted': oklch(0.45, CHROMA.surface, h),
		outline: oklch(0.88, CHROMA.surface * 2, h),
		primary: oklch(0.55, CHROMA.primary, h),
		'on-primary': oklch(0.99, 0, 0),
		agent: oklch(0.65, CHROMA.agent, ROLE_HUES.agent),
		error: oklch(0.53, CHROMA.error, ROLE_HUES.error),
		'accent-1': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[1]),
		'accent-2': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[2]),
		'accent-3': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[3]),
		'accent-4': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[4]),
		'accent-5': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[5]),
		'accent-6': oklch(0.6, ACCENT_CHROMA, ACCENT_HUES[6]),
	}
}

export function generateDarkPalette(): ThemeRoles {
	const h = SEED_HUES.primary
	return {
		surface: oklch(0.18, CHROMA.surface, h),
		'surface-raised': oklch(0.22, CHROMA.surface, h),
		'surface-sunken': oklch(0.14, CHROMA.surface, h),
		'on-surface': oklch(0.93, CHROMA.surface, h),
		'on-surface-muted': oklch(0.6, CHROMA.surface, h),
		outline: oklch(0.3, CHROMA.surface * 2, h),
		primary: oklch(0.7, CHROMA.primary, h),
		'on-primary': oklch(0.1, 0, 0),
		agent: oklch(0.7, CHROMA.agent, ROLE_HUES.agent),
		error: oklch(0.6, CHROMA.error, ROLE_HUES.error),
		'accent-1': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[1]),
		'accent-2': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[2]),
		'accent-3': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[3]),
		'accent-4': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[4]),
		'accent-5': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[5]),
		'accent-6': oklch(0.72, ACCENT_CHROMA, ACCENT_HUES[6]),
	}
}
