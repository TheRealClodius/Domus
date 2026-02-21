'use client'

import { reduce, summarize } from '@/apps/sounds/reduce'
import type { SoundsState } from '@/apps/sounds/types'
import WindowHeaderOptions from '@/core/entity/WindowHeaderOptions'
import { useEntityStore } from '@/core/entityStore'

export default function SoundsTransport({ entityId }: { entityId: string }) {
	const playing = useEntityStore(
		(s) => (s.entities[entityId]?.state as SoundsState | undefined)?.playing ?? false,
	)
	const updateState = useEntityStore((s) => s.updateState)

	const handleToggle = () => {
		const current = useEntityStore.getState().entities[entityId]
		if (!current) return
		const newState = reduce(current.state, 'toggle_play', {})
		const newSummary = summarize(newState)
		updateState(entityId, newState, newSummary)
	}

	return (
		<WindowHeaderOptions
			options={[
				{
					key: 'play',
					label: playing ? 'Stop' : 'Play',
					onClick: handleToggle,
					isActive: playing,
				},
			]}
		/>
	)
}
