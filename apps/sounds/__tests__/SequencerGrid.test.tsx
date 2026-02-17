import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SequencerGrid from '@/apps/sounds/SequencerGrid'
import { DEFAULT_SOUNDS_STATE, type SoundsState, VOICES } from '@/apps/sounds/types'

describe('SequencerGrid', () => {
	afterEach(() => cleanup())

	function renderGrid(overrides?: { state?: Partial<SoundsState>; currentStep?: number }) {
		const state: SoundsState = { ...DEFAULT_SOUNDS_STATE, ...overrides?.state }
		const dispatch = vi.fn()
		render(
			<SequencerGrid
				state={state}
				dispatch={dispatch}
				currentStep={overrides?.currentStep ?? -1}
			/>,
		)
		return { dispatch }
	}

	it('renders 6 voice rows with labels', () => {
		renderGrid()
		for (const voice of VOICES) {
			expect(screen.getByText(voice)).toBeDefined()
		}
	})

	it('cell click dispatches toggle_step', async () => {
		const { dispatch } = renderGrid()
		const user = userEvent.setup()
		const cells = screen.getAllByRole('button', { name: /step/i })
		expect(cells.length).toBe(VOICES.length * 16)
		await user.click(cells[0])
		expect(dispatch).toHaveBeenCalledWith('toggle_step', { voice: 'kick', step: 0 })
	})

	it('active cells have accent color class', () => {
		renderGrid({
			state: {
				voices: {
					...DEFAULT_SOUNDS_STATE.voices,
					kick: { ...DEFAULT_SOUNDS_STATE.voices.kick, pattern: [true, ...Array(15).fill(false)] },
				},
			},
		})
		const cells = screen.getAllByRole('button', { name: /step/i })
		expect(cells[0].className).toMatch(/accent-6/)
	})

	it('muted voice shows checked switch', () => {
		renderGrid({
			state: {
				voices: {
					...DEFAULT_SOUNDS_STATE.voices,
					snare: { ...DEFAULT_SOUNDS_STATE.voices.snare, muted: true },
				},
			},
		})
		const switches = screen.getAllByRole('switch')
		expect(switches[1].getAttribute('data-state')).toBe('checked')
	})

	it('step indicator shows correct position when playing', () => {
		renderGrid({ currentStep: 3 })
		const indicator = screen.getByTestId('step-indicator')
		expect(indicator).toBeDefined()
		expect(indicator.getAttribute('data-step')).toBe('3')
	})
})
