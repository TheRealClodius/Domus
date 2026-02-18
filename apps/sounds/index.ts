import { Music } from 'lucide-react'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'
import SoundsApp from '@/apps/sounds/SoundsApp'
import SoundsTransport from '@/apps/sounds/SoundsTransport'
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

function reduce(
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

function summarize(state: Record<string, unknown>): string {
	const s = state.voices !== undefined ? (state as unknown as SoundsState) : DEFAULT_SOUNDS_STATE
	const activeVoices = VOICES.filter((v) => s.voices[v].pattern.some(Boolean)).length
	const status = s.playing ? 'playing' : 'stopped'
	return `Sounds — ${s.bpm} BPM, ${activeVoices} voices, ${status}`
}

// SPIKE: entity-as-mcp — state-computed schema, tools gated on playing state
const voiceParam = {
	voice: {
		type: 'string',
		enum: ['kick', 'snare', 'hihat', 'openhat', 'clap', 'bass'],
		description: 'The voice/instrument to target',
	},
} as const

function getSchema(state: Record<string, unknown>): ToolSchema[] {
	const s = state.voices !== undefined ? (state as unknown as SoundsState) : DEFAULT_SOUNDS_STATE
	const tools: ToolSchema[] = [
		{
			name: 'set_bpm',
			description: 'Set the tempo in beats per minute (60–180)',
			inputSchema: {
				type: 'object',
				properties: {
					bpm: { type: 'number', description: 'Beats per minute (60–180)' },
				},
				required: ['bpm'],
			},
		},
		{
			name: 'set_swing',
			description: 'Set the swing amount (0–100)',
			inputSchema: {
				type: 'object',
				properties: {
					swing: { type: 'number', description: 'Swing amount (0–100)' },
				},
				required: ['swing'],
			},
		},
		{
			name: 'toggle_play',
			description: s.playing ? 'Stop playback' : 'Start playback',
			inputSchema: { type: 'object', properties: {} },
		},
		{
			name: 'toggle_mute',
			description: 'Mute or unmute a voice',
			inputSchema: {
				type: 'object',
				properties: voiceParam,
				required: ['voice'],
			},
		},
		{
			name: 'set_volume',
			description: 'Set the volume for a voice (0–100)',
			inputSchema: {
				type: 'object',
				properties: {
					...voiceParam,
					volume: { type: 'number', description: 'Volume level (0–100)' },
				},
				required: ['voice', 'volume'],
			},
		},
	]

	// Pattern-editing tools only available when not playing
	if (!s.playing) {
		tools.push(
			{
				name: 'toggle_step',
				description: 'Toggle a step on/off in a voice pattern',
				inputSchema: {
					type: 'object',
					properties: {
						...voiceParam,
						step: {
							type: 'number',
							description: `Step index (0–${STEPS - 1})`,
						},
					},
					required: ['voice', 'step'],
				},
			},
			{
				name: 'clear_pattern',
				description: 'Clear all steps for a single voice',
				inputSchema: {
					type: 'object',
					properties: voiceParam,
					required: ['voice'],
				},
			},
			{
				name: 'clear_all',
				description: 'Clear all patterns and stop playback',
				inputSchema: { type: 'object', properties: {} },
			},
		)
	}

	return tools
}

export const soundsApp: BuiltInApp = {
	source: 'built-in',
	type: 'sounds',
	name: 'Sounds',
	icon: Music,
	component: SoundsApp,
	windowActions: SoundsTransport,
	defaultPresentation: 'window',
	defaultSize: { width: 600, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
	getSchema,
}
