import { describe, expect, it } from 'vitest'
import {
	ACCENT_CHROMA,
	ACCENT_HUES,
	BLUR,
	CHROMA,
	RADIUS,
	ROLE_HUES,
	SEED_HUES,
	SHADOW,
	SHADOW_AGENT_GLOW,
	SHADOW_DARK,
	SHADOW_DRAGGING,
	SHADOW_DRAGGING_DARK,
	SHADOW_FOCUS_RING,
	SHADOW_FOCUSED,
	SHADOW_FOCUSED_DARK,
	SHADOW_OVERLAY,
	SHADOW_OVERLAY_DARK,
	SPACING_BASE,
	TYPE,
} from '@/tokens/seeds'

describe('seeds', () => {
	describe('shadow scale', () => {
		it('has 5 shadow levels: resting, elevated, focused, overlay, dragging', () => {
			expect(SHADOW.resting).toMatch(/rgb/)
			expect(SHADOW.elevated).toMatch(/rgb/)
			expect(SHADOW_FOCUSED).toMatch(/rgb/)
			expect(SHADOW_OVERLAY).toMatch(/rgb/)
			expect(SHADOW_DRAGGING).toMatch(/rgb/)
		})

		it('has dark variants for all 5 shadow levels', () => {
			expect(SHADOW_DARK.resting).toMatch(/rgb/)
			expect(SHADOW_DARK.elevated).toMatch(/rgb/)
			expect(SHADOW_FOCUSED_DARK).toMatch(/rgb/)
			expect(SHADOW_OVERLAY_DARK).toMatch(/rgb/)
			expect(SHADOW_DRAGGING_DARK).toMatch(/rgb/)
		})

		it('has agent glow shadow with oklch agent color', () => {
			expect(SHADOW_AGENT_GLOW).toMatch(/oklch/)
		})

		it('has focus ring shadow with oklch primary color', () => {
			expect(SHADOW_FOCUS_RING).toMatch(/oklch/)
		})
	})

	describe('blur tiers', () => {
		it('has subtle, medium, and heavy blur values', () => {
			expect(BLUR.subtle).toBe('4px')
			expect(BLUR.medium).toBe('12px')
			expect(BLUR.heavy).toBe('20px')
		})
	})

	describe('radius scale', () => {
		it('has small, medium, large, and xlarge tiers', () => {
			expect(RADIUS.small).toBeDefined()
			expect(RADIUS.medium).toBeDefined()
			expect(RADIUS.large).toBeDefined()
			expect(RADIUS.xlarge).toBeDefined()
		})

		it('xlarge is 20px for prompt bar pill', () => {
			expect(RADIUS.xlarge).toBe('20px')
		})
	})

	describe('accent hues', () => {
		const hues = Object.values(ACCENT_HUES)
		const reserved = [SEED_HUES.primary, ROLE_HUES.agent, ROLE_HUES.error]

		it('has 6 hues all in 0-360 range', () => {
			expect(hues).toHaveLength(6)
			for (const h of hues) {
				expect(h).toBeGreaterThanOrEqual(0)
				expect(h).toBeLessThanOrEqual(360)
			}
		})

		it('no hue within 15 degrees of primary, agent, or error', () => {
			for (const h of hues) {
				for (const r of reserved) {
					const dist = Math.min(Math.abs(h - r), 360 - Math.abs(h - r))
					expect(dist).toBeGreaterThanOrEqual(15)
				}
			}
		})

		it('accent chroma is below primary chroma', () => {
			expect(ACCENT_CHROMA).toBeLessThan(CHROMA.primary)
		})
	})

	describe('existing seeds are preserved', () => {
		it('has primary and secondary hues', () => {
			expect(SEED_HUES.primary).toBe(55)
			expect(SEED_HUES.secondary).toBe(230)
		})

		it('has role hues for agent and error', () => {
			expect(ROLE_HUES.agent).toBe(40)
			expect(ROLE_HUES.error).toBe(25)
		})

		it('has chroma values for surface, primary, agent, error', () => {
			expect(CHROMA.surface).toBe(0.01)
			expect(CHROMA.primary).toBe(0.12)
			expect(CHROMA.agent).toBe(0.14)
			expect(CHROMA.error).toBe(0.18)
		})

		it('has spacing base of 4', () => {
			expect(SPACING_BASE).toBe(4)
		})

		it('has type scale with label, body, title', () => {
			expect(TYPE.size.label).toBeDefined()
			expect(TYPE.size.body).toBeDefined()
			expect(TYPE.size.title).toBeDefined()
		})
	})
})
