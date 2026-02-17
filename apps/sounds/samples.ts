import { VOICES, type VoiceName } from '@/apps/sounds/types'

export async function loadSamples(ctx: AudioContext): Promise<Record<VoiceName, AudioBuffer>> {
	const entries = await Promise.all(
		VOICES.map(async (voice) => {
			const res = await fetch(`/sounds/${voice}.wav`)
			const buf = await res.arrayBuffer()
			const audio = await ctx.decodeAudioData(buf)
			return [voice, audio] as const
		}),
	)
	return Object.fromEntries(entries) as Record<VoiceName, AudioBuffer>
}
