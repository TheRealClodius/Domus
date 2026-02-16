import { describe, expect, test } from 'vitest'

import { generateDarkPalette, generateLightPalette, REQUIRED_ROLES } from '@/tokens/palettes'

const OKLCH_PATTERN = /^oklch\(.+\)$/

function parseLightness(oklchValue: string): number {
	const match = oklchValue.match(/oklch\(\s*([\d.]+)/)
	if (!match) throw new Error(`Could not parse lightness from: ${oklchValue}`)
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
