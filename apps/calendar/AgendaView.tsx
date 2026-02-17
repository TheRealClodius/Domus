'use client'

import { useMemo, useState } from 'react'
import {
	DAY_NAMES,
	formatTime,
	getEventDays,
	MONTH_NAMES,
	toDateString,
} from '@/apps/calendar/dateUtils'
import { EVENT_COLOR_MAP } from '@/apps/calendar/eventLayout'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { Button } from '@/core/ui/button'

function formatDateHeader(date: Date): string {
	const dayName = DAY_NAMES[date.getDay()]
	const month = MONTH_NAMES[date.getMonth()]
	return `${dayName}, ${month} ${date.getDate()}`
}

interface AgendaViewProps {
	selectedDate: string
	events: CalendarEvent[]
	onClickEvent: (eventId: string) => void
}

export default function AgendaView({ selectedDate, events, onClickEvent }: AgendaViewProps) {
	const [daysAhead, setDaysAhead] = useState(14)

	const grouped = useMemo(() => {
		const start = new Date(`${selectedDate}T00:00:00`)
		const groups: { date: Date; dateStr: string; events: CalendarEvent[] }[] = []
		const eventMap: Record<string, CalendarEvent[]> = {}

		for (const event of events) {
			const days = getEventDays(event.state.start, event.state.end)
			for (const dayKey of days) {
				if (!eventMap[dayKey]) eventMap[dayKey] = []
				eventMap[dayKey].push(event)
			}
		}

		// Show daysAhead days, skip empty days
		for (let i = 0; i < daysAhead; i++) {
			const d = new Date(start)
			d.setDate(start.getDate() + i)
			const dateStr = toDateString(d)
			const dayEvents = eventMap[dateStr]
			if (dayEvents && dayEvents.length > 0) {
				groups.push({ date: d, dateStr, events: dayEvents })
			}
		}

		return groups
	}, [selectedDate, events, daysAhead])

	if (grouped.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center" data-testid="agenda-view">
				<p className="text-body text-on-surface-muted">No upcoming events</p>
			</div>
		)
	}

	return (
		<div className="scroll-fade flex-1 overflow-y-auto px-3 py-2" data-testid="agenda-view">
			{grouped.map((group) => (
				<div key={group.dateStr} className="mb-4">
					<h3 className="mb-1 font-display text-title-xs text-on-surface">
						{formatDateHeader(group.date)}
					</h3>
					<div className="flex flex-col gap-1">
						{group.events.map((event) => (
							<button
								type="button"
								key={event.id}
								className="flex items-center gap-2 rounded-xs px-2 py-1.5 text-left hover:bg-surface-sunken"
								onClick={() => onClickEvent(event.id)}
							>
								<span
									className={`size-1.5 shrink-0 rounded-full ${(event.state.color ?? 'default') === 'default' ? 'bg-on-surface-muted' : EVENT_COLOR_MAP[event.state.color ?? 'default']}`}
								/>
								<span className="text-label text-on-surface-muted">
									{event.state.all_day ? 'All day' : formatTime(event.state.start)}
								</span>
								<span className="text-body text-on-surface">{event.state.title}</span>
							</button>
						))}
					</div>
				</div>
			))}
			<div className="flex justify-center py-2">
				<Button variant="ghost" size="sm" onClick={() => setDaysAhead((d) => d + 14)}>
					Load more
				</Button>
			</div>
		</div>
	)
}
