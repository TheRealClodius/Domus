export type VoiceName = 'kick' | 'snare' | 'hihat' | 'openhat' | 'clap' | 'bass'

export const VOICES: VoiceName[] = ['kick', 'snare', 'hihat', 'openhat', 'clap', 'bass']

export const STEPS = 16

export const VOICE_COLORS: Record<VoiceName, string> = {
	kick: 'accent-6',
	snare: 'accent-1',
	hihat: 'accent-5',
	openhat: 'accent-2',
	clap: 'accent-3',
	bass: 'accent-4',
}

export interface VoiceState {
	pattern: boolean[]
	muted: boolean
	volume: number
}

export interface SoundsState {
	bpm: number
	swing: number
	playing: boolean
	voices: Record<VoiceName, VoiceState>
}

export const DEFAULT_VOICE_STATE: VoiceState = {
	pattern: Array.from({ length: STEPS }, () => false),
	muted: false,
	volume: 80,
}

export const DEFAULT_SOUNDS_STATE: SoundsState = {
	bpm: 120,
	swing: 0,
	playing: false,
	voices: Object.fromEntries(
		VOICES.map((v) => [v, { ...DEFAULT_VOICE_STATE, pattern: [...DEFAULT_VOICE_STATE.pattern] }]),
	) as Record<VoiceName, VoiceState>,
}
