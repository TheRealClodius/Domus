'use client'

import { type SoundsState, VOICES } from '@/apps/sounds/types'
import { useSequencer } from '@/apps/sounds/useSequencer'
import VoiceRow from '@/apps/sounds/VoiceRow'

interface SequencerGridProps {
	state: SoundsState
	dispatch: (action: string, params: unknown) => void
	entityId: string
}

export default function SequencerGrid({ state, dispatch, entityId }: SequencerGridProps) {
	const { currentStep } = useSequencer(entityId)

	return (
		<div className="flex flex-col gap-1.5 px-3 py-2">
			{VOICES.map((voice) => (
				<VoiceRow
					key={voice}
					voice={voice}
					state={state.voices[voice]}
					currentStep={currentStep}
					dispatch={dispatch}
				/>
			))}
			<div
				data-testid="step-indicator"
				data-step={currentStep}
				className="h-1 rounded-full bg-primary/20"
			/>
		</div>
	)
}
