import { Music } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'
import { reduce, summarize } from '@/apps/sounds/reduce'
import { DEFAULT_SOUNDS_STATE, type SoundsState, STEPS } from '@/apps/sounds/types'

const SoundsApp = dynamic(() => import('@/apps/sounds/SoundsApp'))
const SoundsTransport = dynamic(() => import('@/apps/sounds/SoundsTransport'))

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
	description:
		'Step sequencer and drum machine. Control tempo, swing, voice patterns, and playback via call_entity_tool.',
	icon: Music,
	component: SoundsApp,
	windowActions: SoundsTransport,
	defaultPresentation: 'window',
	defaultSize: { width: 600, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
	summarizeOn: [
		'set_bpm',
		'toggle_voice',
		'set_voice_muted',
		'set_pattern',
		'toggle_step',
		'set_swing',
		'set_volume',
		'toggle_mute',
		'clear_pattern',
		'clear_all',
	],
	summarizeDebounceMs: 3000,
	getSchema,
}
