'use client'

import StepCell from '@/apps/sounds/StepCell'
import { STEPS, VOICE_COLORS, type VoiceName, type VoiceState } from '@/apps/sounds/types'
import { Slider } from '@/core/ui/slider'
import { Switch } from '@/core/ui/switch'

interface VoiceRowProps {
	voice: VoiceName
	state: VoiceState
	currentStep: number
	dispatch: (action: string, params: unknown) => void
}

export default function VoiceRow({ voice, state, currentStep, dispatch }: VoiceRowProps) {
	const accent = VOICE_COLORS[voice]
	return (
		<div className="flex items-center gap-2">
			<div className="flex w-16 items-center gap-1.5 shrink-0">
				<span className={`size-2 rounded-full bg-${accent}`} />
				<span className="text-label text-on-surface-muted truncate">{voice}</span>
			</div>

			<div className="flex gap-px">
				{Array.from({ length: STEPS }, (_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-size 16-step grid never reorders
					<div key={`${voice}-${i}`} className={i > 0 && i % 4 === 0 ? 'ml-1.5' : ''}>
						<StepCell
							active={state.pattern[i]}
							accentClass={accent}
							step={i}
							voice={voice}
							currentStep={currentStep}
							onClick={() => dispatch('toggle_step', { voice, step: i })}
						/>
					</div>
				))}
			</div>

			<Switch
				size="sm"
				checked={state.muted}
				onCheckedChange={() => dispatch('toggle_mute', { voice })}
			/>

			<div className="w-16 shrink-0">
				<Slider
					size="sm"
					min={0}
					max={100}
					value={[state.volume]}
					onValueChange={([v]) => dispatch('set_volume', { voice, volume: v })}
				/>
			</div>
		</div>
	)
}
