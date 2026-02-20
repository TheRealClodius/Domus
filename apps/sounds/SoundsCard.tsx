'use client'

import { DEFAULT_SOUNDS_STATE, type SoundsState, VOICE_COLORS, VOICES } from '@/apps/sounds/types'

interface SoundsCardProps {
	state: SoundsState
}

export default function SoundsCard({ state }: SoundsCardProps) {
	const s = state.voices ? state : DEFAULT_SOUNDS_STATE
	return (
		<div data-testid="sounds-card" className="flex flex-col gap-2 p-3">
			<div className="flex flex-col gap-0.5">
				{VOICES.map((voice) => (
					<div key={voice} className="flex gap-px">
						{s.voices[voice].pattern.map((active, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed 16-step grid
								key={i}
								className={`size-1.5 rounded-full ${active ? `bg-${VOICE_COLORS[voice]}` : 'bg-surface'}`}
							/>
						))}
					</div>
				))}
			</div>
			<span className="text-label text-on-surface-muted">
				{s.bpm} BPM · {s.playing ? 'playing' : 'stopped'}
			</span>
		</div>
	)
}
