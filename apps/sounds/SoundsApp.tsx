'use client'

import type { AppProps } from '@/apps/_types'
import SequencerGrid from '@/apps/sounds/SequencerGrid'
import SoundsCard from '@/apps/sounds/SoundsCard'
import SoundsHeader from '@/apps/sounds/SoundsHeader'
import { DEFAULT_SOUNDS_STATE, type SoundsState } from '@/apps/sounds/types'
import { useSequencer } from '@/apps/sounds/useSequencer'

export default function SoundsApp({ entityId, state, dispatch, mode }: AppProps) {
	const s = (state as unknown as SoundsState).voices
		? (state as unknown as SoundsState)
		: DEFAULT_SOUNDS_STATE
	const { initAudio } = useSequencer(entityId)

	if (mode === 'card') {
		return <SoundsCard state={s} />
	}

	return (
		<div className="flex h-full flex-col" onPointerDown={initAudio}>
			<SoundsHeader state={s} dispatch={dispatch} />
			<SequencerGrid state={s} dispatch={dispatch} entityId={entityId} />
		</div>
	)
}
