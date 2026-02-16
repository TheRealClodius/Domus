'use client'

import { useMemo } from 'react'
import { getDayName, getMonthGridDays, isToday, toDateString } from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

const EVENT_COLOR_MAP: Record<string, string> = {
	default: 'bg-primary',
	warm: 'bg-agent',
	cool: 'bg-primary',
	muted: 'bg-on-surface-muted',
}

function EventDot({ event }: { event: CalendarEvent }) {
	const glowing = useAgentGlow({ created_by: event.created_by, updated_at: event.updated_at })
	const color = EVENT_COLOR_MAP[event.state.color ?? 'default']

	return <span className={`size-1.5 rounded-full ${color} ${glowing ? 'animate-pulse' : ''}`} />
}

interface MonthViewProps {
	year: number
	month: number
	events: CalendarEvent[]
	onSelectDay: (date: string) => void
}

export default function MonthView({ year, month, events, onSelectDay }: MonthViewProps) {
	const days = useMemo(() => getMonthGridDays(year, month), [year, month])

	const eventsByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {}
		for (const event of events) {
			const dayKey = event.state.start.slice(0, 10)
			if (!map[dayKey]) map[dayKey] = []
			map[dayKey].push(event)
		}
		return map
	}, [events])

	return (
		<div className="flex flex-1 flex-col" data-testid="month-view">
			{/* Day headers */}
			<div className="grid grid-cols-7">
				{Array.from({ length: 7 }, (_, i) => (
					<div key={getDayName(i)} className="py-1 text-center text-label text-on-surface-muted">
						{getDayName(i)}
					</div>
				))}
			</div>

			{/* Day grid — 6 rows of 7 */}
			<div className="grid flex-1 grid-cols-7 grid-rows-6">
				{days.map((day) => {
					const dateStr = toDateString(day)
					const isCurrentMonth = day.getMonth() === month
					const today = isToday(day)
					const dayEvents = eventsByDay[dateStr] ?? []
					const visibleDots = dayEvents.slice(0, 3)
					const overflow = dayEvents.length - 3

					return (
						<button
							key={dateStr}
							type="button"
							className="flex flex-col items-center gap-0.5 border-t border-outline/20 pt-1"
							style={isCurrentMonth ? undefined : { opacity: 0.4 }}
							onClick={() => onSelectDay(dateStr)}
						>
							<span
								className={
									today
										? 'flex size-6 items-center justify-center rounded-full bg-primary text-label text-on-primary'
										: 'text-body text-on-surface'
								}
							>
								{day.getDate()}
							</span>

							{/* Event dots */}
							{dayEvents.length > 0 && (
								<div className="flex gap-0.5">
									{visibleDots.map((evt) => (
										<EventDot key={evt.id} event={evt} />
									))}
									{overflow > 0 && (
										<span className="text-label text-on-surface-muted" style={{ fontSize: '8px' }}>
											+{overflow}
										</span>
									)}
								</div>
							)}
						</button>
					)
				})}
			</div>
		</div>
	)
}
