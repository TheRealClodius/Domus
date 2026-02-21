'use client'

import { reduce, summarize } from '@/apps/calendar/reduce'
import type { CalendarView } from '@/apps/calendar/types'
import WindowHeaderOptions from '@/core/entity/WindowHeaderOptions'
import { useEntityStore } from '@/core/entityStore'

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
	{ value: 'month', label: 'M' },
	{ value: 'week', label: 'W' },
	{ value: 'day', label: 'D' },
	{ value: 'agenda', label: 'A' },
]

export default function CalendarViewSwitcher({ entityId }: { entityId: string }) {
	const currentView = useEntityStore(
		(s) => (s.entities[entityId]?.state?.view as CalendarView) ?? 'month',
	)
	const updateState = useEntityStore((s) => s.updateState)

	const handleChangeView = (view: CalendarView) => {
		const current = useEntityStore.getState().entities[entityId]
		if (!current) return
		const newState = reduce(current.state, 'set_view', { view })
		const newSummary = summarize(newState)
		updateState(entityId, newState, newSummary)
	}

	return (
		<WindowHeaderOptions
			mode="radio"
			options={VIEW_OPTIONS.map((opt) => ({
				key: opt.value,
				label: opt.label,
				onClick: () => handleChangeView(opt.value),
				isActive: currentView === opt.value,
			}))}
		/>
	)
}
