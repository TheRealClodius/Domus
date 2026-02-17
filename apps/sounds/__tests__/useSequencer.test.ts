import { describe, expect, it } from 'vitest'

/**
 * Scheduling math extracted from useSequencer for testability.
 * No Web Audio API needed — pure arithmetic.
 */

/** Milliseconds per step at a given BPM (16th notes, 4 steps per beat) */
function stepIntervalMs(bpm: number): number {
	return (60 / bpm / 4) * 1000
}

/** Swing offset in seconds for a given step. Odd steps get delayed. */
function swingOffset(step: number, swing: number, bpm: number): number {
	if (step % 2 === 0) return 0
	const halfStep = 60 / bpm / 4 / 2
	return (swing / 100) * halfStep
}

describe('Sequencer scheduling math', () => {
	it('calculates step interval from BPM', () => {
		// 120 BPM → 0.5s per beat → 0.125s per 16th → 125ms
		expect(stepIntervalMs(120)).toBeCloseTo(125)
		// 60 BPM → 1s per beat → 0.25s per 16th → 250ms
		expect(stepIntervalMs(60)).toBeCloseTo(250)
		// 180 BPM → 0.333s per beat → 0.0833s per 16th → 83.33ms
		expect(stepIntervalMs(180)).toBeCloseTo(83.33, 1)
	})

	it('swing offset is 0 for even steps', () => {
		expect(swingOffset(0, 50, 120)).toBe(0)
		expect(swingOffset(2, 100, 120)).toBe(0)
		expect(swingOffset(14, 75, 90)).toBe(0)
	})

	it('swing 0 produces no offset on odd steps', () => {
		expect(swingOffset(1, 0, 120)).toBe(0)
		expect(swingOffset(3, 0, 120)).toBe(0)
	})

	it('swing 100 produces triplet feel on odd steps', () => {
		// At 120 BPM: halfStep = 60/120/4/2 = 0.0625s
		// swing 100 → offset = 1.0 * 0.0625 = 0.0625s
		const offset = swingOffset(1, 100, 120)
		expect(offset).toBeCloseTo(0.0625)
	})

	it('swing 50 produces half of max offset', () => {
		const full = swingOffset(1, 100, 120)
		const half = swingOffset(1, 50, 120)
		expect(half).toBeCloseTo(full / 2)
	})
})
