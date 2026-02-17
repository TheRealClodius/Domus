import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SOUNDS_STATE, VOICES } from '@/apps/sounds/types'

// Mock useSequencer — no Web Audio in tests
vi.mock('@/apps/sounds/useSequencer', () => ({
	useSequencer: () => ({ currentStep: -1, audioReady: false, initAudio: vi.fn() }),
}))

describe('SoundsApp', () => {
	afterEach(() => cleanup())

	it('renders grid with 6 voice rows in window mode', async () => {
		const { default: SoundsApp } = await import('@/apps/sounds/SoundsApp')
		render(<SoundsApp entityId="test-1" state={DEFAULT_SOUNDS_STATE} dispatch={vi.fn()} />)
		for (const voice of VOICES) {
			expect(screen.getByText(voice)).toBeDefined()
		}
	})

	it('renders card mode when mode=card', async () => {
		const { default: SoundsApp } = await import('@/apps/sounds/SoundsApp')
		render(
			<SoundsApp entityId="test-1" state={DEFAULT_SOUNDS_STATE} dispatch={vi.fn()} mode="card" />,
		)
		// Card mode shows mini grid, not voice labels
		expect(screen.getByTestId('sounds-card')).toBeDefined()
	})
})
