import {
	DEFAULT_SOUNDS_STATE,
	type SoundsState,
	STEPS,
	VOICES,
	type VoiceName,
} from '@/apps/sounds/types'

function hydrate(state: Record<string, unknown>): SoundsState {
	if (state.voices !== undefined) {
		// Already hydrated — force playing to false on load
		return { ...(state as unknown as SoundsState), playing: false }
	}
	return { ...DEFAULT_SOUNDS_STATE }
}

export function reduce(
	state: Record<string, unknown>,
	action: string,
	params: unknown,
): Record<string, unknown> {
	const s = state.voices !== undefined ? (state as unknown as SoundsState) : hydrate(state)
	const p = params as Record<string, unknown>

	switch (action) {
		case 'toggle_step': {
			const voice = p.voice as VoiceName
			const step = p.step as number
			const newPattern = [...s.voices[voice].pattern]
			newPattern[step] = !newPattern[step]
			return {
				...s,
				voices: {
					...s.voices,
					[voice]: { ...s.voices[voice], pattern: newPattern },
				},
			}
		}
		case 'set_bpm':
			return { ...s, bpm: Math.max(60, Math.min(180, p.bpm as number)) }
		case 'set_swing':
			return { ...s, swing: Math.max(0, Math.min(100, p.swing as number)) }
		case 'toggle_play':
			return { ...s, playing: !s.playing }
		case 'toggle_mute': {
			const voice = p.voice as VoiceName
			return {
				...s,
				voices: {
					...s.voices,
					[voice]: { ...s.voices[voice], muted: !s.voices[voice].muted },
				},
			}
		}
		case 'set_volume': {
			const voice = p.voice as VoiceName
			const volume = Math.max(0, Math.min(100, p.volume as number))
			return {
				...s,
				voices: {
					...s.voices,
					[voice]: { ...s.voices[voice], volume },
				},
			}
		}
		case 'clear_pattern': {
			const voice = p.voice as VoiceName
			return {
				...s,
				voices: {
					...s.voices,
					[voice]: { ...s.voices[voice], pattern: Array.from({ length: STEPS }, () => false) },
				},
			}
		}
		case 'clear_all': {
			const voices = {} as Record<VoiceName, SoundsState['voices'][VoiceName]>
			for (const v of VOICES) {
				voices[v] = { ...s.voices[v], pattern: Array.from({ length: STEPS }, () => false) }
			}
			return { ...s, playing: false, voices }
		}
		default:
			return state
	}
}

export function summarize(state: Record<string, unknown>): string {
	const s = state.voices !== undefined ? (state as unknown as SoundsState) : DEFAULT_SOUNDS_STATE
	const activeVoices = VOICES.filter((v) => s.voices[v].pattern.some(Boolean)).length
	const status = s.playing ? 'playing' : 'stopped'
	return `Sounds — ${s.bpm} BPM, ${activeVoices} voices, ${status}`
}
