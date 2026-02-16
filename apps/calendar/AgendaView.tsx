'use client'

import { useMemo } from 'react'
import { formatTime, toDateString } from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

const EVENT_DOT_MAP: Record<string, string> = {
	default: 'bg-primary',
	warm: 'bg-agent',
	cool: 'bg-primary',
	muted: 'bg-on-surface-muted',
}

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

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
	const grouped = useMemo(() => {
		const start = new Date(`${selectedDate}T00:00:00`)
		const groups: { date: Date; dateStr: string; events: CalendarEvent[] }[] = []
		const eventMap: Record<string, CalendarEvent[]> = {}

		for (const event of events) {
			const dayKey = event.state.start.slice(0, 10)
			if (!eventMap[dayKey]) eventMap[dayKey] = []
			eventMap[dayKey].push(event)
		}

		// Show 14 days ahead, skip empty days
		for (let i = 0; i < 14; i++) {
			const d = new Date(start)
			d.setDate(start.getDate() + i)
			const dateStr = toDateString(d)
			const dayEvents = eventMap[dateStr]
			if (dayEvents && dayEvents.length > 0) {
				groups.push({ date: d, dateStr, events: dayEvents })
			}
		}

		return groups
	}, [selectedDate, events])

	if (grouped.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center" data-testid="agenda-view">
				<p className="text-sm text-on-surface-muted">No upcoming events</p>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto px-3 py-2" data-testid="agenda-view">
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
									className={`size-1.5 shrink-0 rounded-full ${EVENT_DOT_MAP[event.state.color ?? 'default']}`}
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
		</div>
	)
}
