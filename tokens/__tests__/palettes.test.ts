import { describe, expect, test } from 'vitest'

import {
	generateDarkPalette,
	generateExtendedTokens,
	generateLightPalette,
	type PaletteParams,
	REQUIRED_ROLES,
} from '@/tokens/palettes'
import { DEFAULT_SEED_HUE, ROLE_HUES } from '@/tokens/seeds'

const OKLCH_PATTERN = /^oklch\(.+\)$/

function parseLightness(oklchValue: string): number {
	const match = oklchValue.match(/oklch\(\s*([\d.]+)/)
	if (!match) throw new Error(`Could not parse lightness from: ${oklchValue}`)
	return Number.parseFloat(match[1])
}

function parseChroma(oklchValue: string): number {
	const match = oklchValue.match(/oklch\(\s*[\d.]+\s+([\d.]+)/)
	if (!match) throw new Error(`Could not parse chroma from: ${oklchValue}`)
	return Number.parseFloat(match[1])
}

function parseHue(oklchValue: string): number {
	const match = oklchValue.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/)
	if (!match) throw new Error(`Could not parse hue from: ${oklchValue}`)
	return Number.parseFloat(match[1])
}

describe('generateLightPalette', () => {
	test('returns an object with all keys from REQUIRED_ROLES', () => {
		const palette = generateLightPalette()
		for (const role of REQUIRED_ROLES) {
			expect(palette).toHaveProperty(role)
		}
	})

	test('all values match oklch(...) pattern', () => {
		const palette = generateLightPalette()
		for (const role of REQUIRED_ROLES) {
			expect(palette[role]).toMatch(OKLCH_PATTERN)
		}
	})

	test('default params produce values matching current tokens.css', () => {
		const palette = generateLightPalette()
		// Surface uses hue 55 (DEFAULT_SURFACE_HUE)
		expect(parseHue(palette.surface)).toBe(55)
		// Primary uses hue 264 (DEFAULT_SEED_HUE)
		expect(parseHue(palette.primary)).toBe(264)
		// Primary chroma is 0.22 (CSS value)
		expect(parseChroma(palette.primary)).toBeCloseTo(0.22, 2)
	})
})

describe('generateDarkPalette', () => {
	test('returns an object with all keys from REQUIRED_ROLES', () => {
		const palette = generateDarkPalette()
		for (const role of REQUIRED_ROLES) {
			expect(palette).toHaveProperty(role)
		}
	})

	test('all values match oklch(...) pattern', () => {
		const palette = generateDarkPalette()
		for (const role of REQUIRED_ROLES) {
			expect(palette[role]).toMatch(OKLCH_PATTERN)
		}
	})
})

describe('light vs dark palette contrast', () => {
	test('light palette surface lightness > dark palette surface lightness', () => {
		const light = generateLightPalette()
		const dark = generateDarkPalette()

		const lightSurfaceLightness = parseLightness(light.surface)
		const darkSurfaceLightness = parseLightness(dark.surface)

		expect(lightSurfaceLightness).toBeGreaterThan(darkSurfaceLightness)
	})
})

describe('agent and error hues are fixed', () => {
	const seeds: PaletteParams[] = [
		{},
		{ seedHue: 0 },
		{ seedHue: 120 },
		{ seedHue: 264 },
		{ seedHue: 350 },
	]

	for (const params of seeds) {
		const label = params.seedHue !== undefined ? `seedHue=${params.seedHue}` : 'default'

		test(`agent hue is ${ROLE_HUES.agent} for light (${label})`, () => {
			const palette = generateLightPalette(params)
			expect(parseHue(palette.agent)).toBe(ROLE_HUES.agent)
			expect(parseHue(palette['agent-container'])).toBe(ROLE_HUES.agent)
		})

		test(`agent hue is ${ROLE_HUES.agent} for dark (${label})`, () => {
			const palette = generateDarkPalette(params)
			expect(parseHue(palette.agent)).toBe(ROLE_HUES.agent)
			expect(parseHue(palette['agent-container'])).toBe(ROLE_HUES.agent)
		})

		test(`error hue is ${ROLE_HUES.error} for light (${label})`, () => {
			const palette = generateLightPalette(params)
			expect(parseHue(palette.error)).toBe(ROLE_HUES.error)
			expect(parseHue(palette['error-container'])).toBe(ROLE_HUES.error)
		})

		test(`error hue is ${ROLE_HUES.error} for dark (${label})`, () => {
			const palette = generateDarkPalette(params)
			expect(parseHue(palette.error)).toBe(ROLE_HUES.error)
			expect(parseHue(palette['error-container'])).toBe(ROLE_HUES.error)
		})
	}
})

describe('surface lightness ordering preserved for any seedHue', () => {
	const lightOrder = [
		'surface-lowest',
		'surface-bright',
		'surface-low',
		'surface',
		'surface-high',
		'surface-highest',
		'surface-dim',
	] as const

	for (const seedHue of [0, 90, 180, 264, 350]) {
		test(`light palette lightness descends for seedHue=${seedHue}`, () => {
			const palette = generateLightPalette({ seedHue })
			const lightnesses = lightOrder.map((role) => parseLightness(palette[role]))
			for (let i = 1; i < lightnesses.length; i++) {
				expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i - 1])
			}
		})

		test(`dark palette surface-lowest > surface-dim for seedHue=${seedHue}`, () => {
			const palette = generateDarkPalette({ seedHue })
			expect(parseLightness(palette['surface-lowest'])).toBeGreaterThan(
				parseLightness(palette['surface-dim']),
			)
		})
	}
})

describe('chromaScale effects', () => {
	test('chromaScale < 1.0 produces lower chroma on primary', () => {
		const normal = generateLightPalette({ chromaScale: 1.0 })
		const muted = generateLightPalette({ chromaScale: 0.5 })
		expect(parseChroma(muted.primary)).toBeLessThan(parseChroma(normal.primary))
	})

	test('chromaScale > 1.0 produces higher chroma on primary', () => {
		const normal = generateLightPalette({ chromaScale: 1.0 })
		const vivid = generateLightPalette({ chromaScale: 2.0 })
		expect(parseChroma(vivid.primary)).toBeGreaterThan(parseChroma(normal.primary))
	})

	test('chromaScale does not affect agent chroma', () => {
		const normal = generateLightPalette({ chromaScale: 1.0 })
		const vivid = generateLightPalette({ chromaScale: 2.0 })
		expect(parseChroma(vivid.agent)).toBe(parseChroma(normal.agent))
	})

	test('chromaScale does not affect error chroma', () => {
		const normal = generateLightPalette({ chromaScale: 1.0 })
		const vivid = generateLightPalette({ chromaScale: 2.0 })
		expect(parseChroma(vivid.error)).toBe(parseChroma(normal.error))
	})

	test('surface chroma has a minimum floor', () => {
		const desaturated = generateLightPalette({ chromaScale: 0.01 })
		expect(parseChroma(desaturated.surface)).toBeGreaterThanOrEqual(0.005)
	})
})

describe('accent hues shift proportionally', () => {
	test('shifting seed by +60 shifts accent-1 by +60', () => {
		const base = generateLightPalette({ seedHue: DEFAULT_SEED_HUE })
		const shifted = generateLightPalette({ seedHue: DEFAULT_SEED_HUE + 60 })
		const baseHue = parseHue(base['accent-1'])
		const shiftedHue = parseHue(shifted['accent-1'])
		// Account for wrap-around: difference should be 60
		const diff = (shiftedHue - baseHue + 360) % 360
		expect(diff).toBeCloseTo(60, 0)
	})

	test('all 6 accents maintain angular spacing when seed changes', () => {
		const base = generateLightPalette({ seedHue: 264 })
		const shifted = generateLightPalette({ seedHue: 100 })

		// Compute spacings for base
		const baseHues = [1, 2, 3, 4, 5, 6].map((i) =>
			parseHue(base[`accent-${i}` as keyof typeof base]),
		)
		const shiftedHues = [1, 2, 3, 4, 5, 6].map((i) =>
			parseHue(shifted[`accent-${i}` as keyof typeof shifted]),
		)

		// Spacing between consecutive accents should be identical
		for (let i = 1; i < 6; i++) {
			const baseSpacing = (baseHues[i] - baseHues[i - 1] + 360) % 360
			const shiftedSpacing = (shiftedHues[i] - shiftedHues[i - 1] + 360) % 360
			expect(shiftedSpacing).toBeCloseTo(baseSpacing, 0)
		}
	})
})

describe('generateExtendedTokens', () => {
	test('includes all ThemeRoles keys as --prefixed tokens', () => {
		const tokens = generateExtendedTokens('light')
		for (const role of REQUIRED_ROLES) {
			expect(tokens).toHaveProperty(`--${role}`)
		}
	})

	test('includes shadow tokens', () => {
		const tokens = generateExtendedTokens('light')
		expect(tokens['--shadow-resting']).toBeDefined()
		expect(tokens['--shadow-elevated']).toBeDefined()
		expect(tokens['--shadow-focused']).toBeDefined()
		expect(tokens['--shadow-focus-ring']).toBeDefined()
		expect(tokens['--shadow-glass-inset']).toBeDefined()
	})

	test('includes pill tokens', () => {
		const tokens = generateExtendedTokens('dark')
		expect(tokens['--pill-base']).toBeDefined()
		expect(tokens['--pill-active']).toBeDefined()
	})

	test('includes glass surface tokens', () => {
		const tokens = generateExtendedTokens('light')
		expect(tokens['--surface-glass']).toBeDefined()
		expect(tokens['--surface-glass-heavy']).toBeDefined()
	})

	test('dark theme produces different shadow values than light', () => {
		const light = generateExtendedTokens('light')
		const dark = generateExtendedTokens('dark')
		expect(light['--shadow-resting']).not.toBe(dark['--shadow-resting'])
	})

	test('chrome handles stay at hue 230 regardless of seed', () => {
		const tokens = generateExtendedTokens('light', { seedHue: 100 })
		expect(tokens['--chrome-handle']).toContain('230')
	})
})
