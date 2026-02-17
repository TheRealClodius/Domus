import { describe, expect, it } from 'vitest'
import { soundsApp } from '@/apps/sounds'
import { DEFAULT_SOUNDS_STATE, type SoundsState, STEPS, VOICES } from '@/apps/sounds/types'

describe('Sounds app definition', () => {
	it('has correct type, name, and source', () => {
		expect(soundsApp.type).toBe('sounds')
		expect(soundsApp.name).toBe('Sounds')
		expect(soundsApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(soundsApp.defaultPresentation).toBe('window')
		expect(soundsApp.defaultSize).toEqual({ width: 600, height: 500 })
	})

	it('is a singleton', () => {
		expect(soundsApp.maxInstances).toBe(1)
	})

	it('has windowActions', () => {
		expect(soundsApp.windowActions).toBeDefined()
	})
})

describe('Sounds reducer', () => {
	it('returns state by reference for unknown action', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const result = soundsApp.reduce(state, 'unknown_action', {})
		expect(result).toBe(state)
	})

	it('hydrates empty state to defaults with playing false', () => {
		const result = soundsApp.reduce({}, 'toggle_play', {}) as SoundsState
		// Should hydrate defaults first, then toggle play
		expect(result.bpm).toBe(120)
		expect(result.swing).toBe(0)
		expect(result.playing).toBe(true)
		expect(VOICES.every((v) => result.voices[v].pattern.length === STEPS)).toBe(true)
	})

	it('toggle_step turns on a step', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const result = soundsApp.reduce(state, 'toggle_step', {
			voice: 'kick',
			step: 0,
		}) as SoundsState
		expect(result.voices.kick.pattern[0]).toBe(true)
	})

	it('toggle_step turns off an active step', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const on = soundsApp.reduce(state, 'toggle_step', {
			voice: 'kick',
			step: 0,
		})
		const off = soundsApp.reduce(on, 'toggle_step', {
			voice: 'kick',
			step: 0,
		}) as SoundsState
		expect(off.voices.kick.pattern[0]).toBe(false)
	})

	it('set_bpm clamps to 60–180', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const low = soundsApp.reduce(state, 'set_bpm', { bpm: 30 }) as SoundsState
		expect(low.bpm).toBe(60)
		const high = soundsApp.reduce(state, 'set_bpm', { bpm: 300 }) as SoundsState
		expect(high.bpm).toBe(180)
		const normal = soundsApp.reduce(state, 'set_bpm', { bpm: 140 }) as SoundsState
		expect(normal.bpm).toBe(140)
	})

	it('set_swing clamps to 0–100', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const low = soundsApp.reduce(state, 'set_swing', { swing: -10 }) as SoundsState
		expect(low.swing).toBe(0)
		const high = soundsApp.reduce(state, 'set_swing', { swing: 200 }) as SoundsState
		expect(high.swing).toBe(100)
		const normal = soundsApp.reduce(state, 'set_swing', { swing: 50 }) as SoundsState
		expect(normal.swing).toBe(50)
	})

	it('toggle_play flips playing', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const result = soundsApp.reduce(state, 'toggle_play', {}) as SoundsState
		expect(result.playing).toBe(true)
		const result2 = soundsApp.reduce(
			result as unknown as Record<string, unknown>,
			'toggle_play',
			{},
		) as SoundsState
		expect(result2.playing).toBe(false)
	})

	it('toggle_mute flips mute for a voice', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const result = soundsApp.reduce(state, 'toggle_mute', {
			voice: 'snare',
		}) as SoundsState
		expect(result.voices.snare.muted).toBe(true)
		const result2 = soundsApp.reduce(result as unknown as Record<string, unknown>, 'toggle_mute', {
			voice: 'snare',
		}) as SoundsState
		expect(result2.voices.snare.muted).toBe(false)
	})

	it('set_volume clamps to 0–100', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const low = soundsApp.reduce(state, 'set_volume', {
			voice: 'kick',
			volume: -10,
		}) as SoundsState
		expect(low.voices.kick.volume).toBe(0)
		const high = soundsApp.reduce(state, 'set_volume', {
			voice: 'kick',
			volume: 150,
		}) as SoundsState
		expect(high.voices.kick.volume).toBe(100)
		const normal = soundsApp.reduce(state, 'set_volume', {
			voice: 'kick',
			volume: 60,
		}) as SoundsState
		expect(normal.voices.kick.volume).toBe(60)
	})

	it('clear_pattern resets one voice', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		const withStep = soundsApp.reduce(state, 'toggle_step', {
			voice: 'kick',
			step: 0,
		})
		const cleared = soundsApp.reduce(withStep, 'clear_pattern', {
			voice: 'kick',
		}) as SoundsState
		expect(cleared.voices.kick.pattern.every((s) => s === false)).toBe(true)
	})

	it('clear_all resets all patterns and stops', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		let s = soundsApp.reduce(state, 'toggle_step', { voice: 'kick', step: 0 })
		s = soundsApp.reduce(s, 'toggle_step', { voice: 'snare', step: 4 })
		s = soundsApp.reduce(s, 'toggle_play', {})
		const cleared = soundsApp.reduce(s, 'clear_all', {}) as SoundsState
		expect(cleared.playing).toBe(false)
		for (const v of VOICES) {
			expect(cleared.voices[v].pattern.every((step) => step === false)).toBe(true)
		}
	})
})

describe('Sounds summarize', () => {
	it('summarizes empty state', () => {
		const result = soundsApp.summarize({})
		expect(result).toContain('Sounds')
		expect(result).toContain('120 BPM')
	})

	it('summarizes BPM, active voices, and playing status', () => {
		const state = { ...DEFAULT_SOUNDS_STATE } as Record<string, unknown>
		let s = soundsApp.reduce(state, 'set_bpm', { bpm: 140 })
		s = soundsApp.reduce(s, 'toggle_step', { voice: 'kick', step: 0 })
		s = soundsApp.reduce(s, 'toggle_step', { voice: 'snare', step: 4 })
		s = soundsApp.reduce(s, 'toggle_play', {})
		const summary = soundsApp.summarize(s)
		expect(summary).toContain('140 BPM')
		expect(summary).toContain('2 voices')
		expect(summary).toContain('playing')
	})

	it('shows stopped when not playing', () => {
		const summary = soundsApp.summarize(DEFAULT_SOUNDS_STATE as unknown as Record<string, unknown>)
		expect(summary).toContain('stopped')
	})
})
