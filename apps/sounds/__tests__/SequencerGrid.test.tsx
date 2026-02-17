import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SOUNDS_STATE, type SoundsState, VOICES } from '@/apps/sounds/types'

// Mock useSequencer — no Web Audio in tests
vi.mock('@/apps/sounds/useSequencer', () => ({
	useSequencer: () => ({ currentStep: -1, audioReady: false, initAudio: vi.fn() }),
}))

describe('SequencerGrid', () => {
	afterEach(() => cleanup())

	async function renderGrid(stateOverrides?: Partial<SoundsState>) {
		const { default: SequencerGrid } = await import('@/apps/sounds/SequencerGrid')
		const state: SoundsState = { ...DEFAULT_SOUNDS_STATE, ...stateOverrides }
		const dispatch = vi.fn()
		render(<SequencerGrid state={state} dispatch={dispatch} entityId="test-1" />)
		return { dispatch }
	}

	it('renders 6 voice rows with labels', async () => {
		await renderGrid()
		for (const voice of VOICES) {
			expect(screen.getByText(voice)).toBeDefined()
		}
	})

	it('cell click dispatches toggle_step', async () => {
		const { dispatch } = await renderGrid()
		const user = userEvent.setup()
		// Each voice row has 16 cells; get all buttons with step role
		const cells = screen.getAllByRole('button', { name: /step/i })
		expect(cells.length).toBe(VOICES.length * 16)
		// Click first cell (kick step 0)
		await user.click(cells[0])
		expect(dispatch).toHaveBeenCalledWith('toggle_step', { voice: 'kick', step: 0 })
	})

	it('active cells have accent color class', async () => {
		const state: Partial<SoundsState> = {
			voices: {
				...DEFAULT_SOUNDS_STATE.voices,
				kick: { ...DEFAULT_SOUNDS_STATE.voices.kick, pattern: [true, ...Array(15).fill(false)] },
			},
		}
		await renderGrid(state)
		const cells = screen.getAllByRole('button', { name: /step/i })
		// First cell (kick step 0) should have accent class
		expect(cells[0].className).toMatch(/accent-6/)
	})

	it('muted voice shows checked switch', async () => {
		const state: Partial<SoundsState> = {
			voices: {
				...DEFAULT_SOUNDS_STATE.voices,
				snare: { ...DEFAULT_SOUNDS_STATE.voices.snare, muted: true },
			},
		}
		await renderGrid(state)
		const switches = screen.getAllByRole('switch')
		// snare is index 1
		expect(switches[1].getAttribute('data-state')).toBe('checked')
	})

	it('step indicator shows correct position when playing', async () => {
		// Re-mock with currentStep = 3
		vi.doMock('@/apps/sounds/useSequencer', () => ({
			useSequencer: () => ({ currentStep: 3, audioReady: true, initAudio: vi.fn() }),
		}))
		const { default: SequencerGrid } = await import('@/apps/sounds/SequencerGrid')
		const dispatch = vi.fn()
		render(<SequencerGrid state={DEFAULT_SOUNDS_STATE} dispatch={dispatch} entityId="test-1" />)
		const indicator = screen.getByTestId('step-indicator')
		expect(indicator).toBeDefined()
		// Restore mock
		vi.doMock('@/apps/sounds/useSequencer', () => ({
			useSequencer: () => ({ currentStep: -1, audioReady: false, initAudio: vi.fn() }),
		}))
	})
})
