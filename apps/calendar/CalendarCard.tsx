'use client'

import { useMemo } from 'react'
import { formatTime } from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useCalendarEvents } from '@/apps/calendar/useCalendarEvents'

export default function CalendarCard() {
	const now = new Date()
	const nowIso = now.toISOString()
	const endDate = new Date(now)
	endDate.setDate(endDate.getDate() + 7)
	const end = endDate.toISOString()

	const events = useCalendarEvents({ start: nowIso, end })

	const upcoming = useMemo(() => {
		return events.filter((e) => e.state.end > nowIso).slice(0, 3)
	}, [events, nowIso])

	if (upcoming.length === 0) {
		return (
			<div className="flex h-full items-center justify-center p-3" data-testid="calendar-card">
				<p className="text-label text-on-surface-muted">No upcoming events</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-2 p-3" data-testid="calendar-card">
			{upcoming.map((evt) => (
				<CalendarCardRow key={evt.id} event={evt} />
			))}
		</div>
	)
}

function CalendarCardRow({ event }: { event: CalendarEvent }) {
	const startDate = new Date(event.state.start)
	const time = event.state.all_day ? 'All day' : formatTime(startDate)

	return (
		<div className="flex items-baseline gap-2">
			<span className="text-label text-on-surface-muted">{time}</span>
			<span className="text-label text-on-surface truncate">{event.state.title}</span>
		</div>
	)
}
