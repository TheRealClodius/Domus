'use client'

import type { SoundsState } from '@/apps/sounds/types'
import { Slider } from '@/core/ui/slider'

interface SoundsHeaderProps {
	state: SoundsState
	dispatch: (action: string, params: unknown) => void
}

export default function SoundsHeader({ state, dispatch }: SoundsHeaderProps) {
	return (
		<div className="flex items-center gap-4 px-3 py-2">
			<div className="flex-1">
				<Slider
					size="sm"
					label="BPM"
					valueDisplay={String(state.bpm)}
					min={60}
					max={180}
					value={[state.bpm]}
					onValueChange={([v]) => dispatch('set_bpm', { bpm: v })}
				/>
			</div>
			<div className="flex-1">
				<Slider
					size="sm"
					label="Swing"
					valueDisplay={String(state.swing)}
					min={0}
					max={100}
					value={[state.swing]}
					onValueChange={([v]) => dispatch('set_swing', { swing: v })}
				/>
			</div>
		</div>
	)
}
