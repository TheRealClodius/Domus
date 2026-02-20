'use client'

import { useEffect, useMemo, useRef } from 'react'
import { formatHour, isToday } from '@/apps/calendar/dateUtils'
import {
	CurrentTimeLine,
	computeOverlapColumns,
	EVENT_COLOR_MAP,
	GUTTER_WIDTH,
	HOUR_HEIGHT,
	TimeGridEventBlock,
} from '@/apps/calendar/eventLayout'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

interface DayViewProps {
	selectedDate: string
	events: CalendarEvent[]
	onClickSlot: (dateTime: string) => void
	onClickEvent: (eventId: string) => void
}

export default function DayView({ selectedDate, events, onClickSlot, onClickEvent }: DayViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const today = isToday(new Date(`${selectedDate}T00:00:00`))

	const allDayEvents = useMemo(() => events.filter((e) => e.state.all_day), [events])
	const timedEvents = useMemo(() => events.filter((e) => !e.state.all_day), [events])
	const layoutEvents = useMemo(() => computeOverlapColumns(timedEvents), [timedEvents])

	useEffect(() => {
		const el = scrollRef.current
		if (!el) return
		const now = new Date()
		const targetScroll = Math.max((now.getHours() - 1) * HOUR_HEIGHT, 0)
		el.scrollTo?.({ top: targetScroll, behavior: 'smooth' })
	}, [])

	const handleSlotClick = (hour: number) => {
		const h = String(hour).padStart(2, '0')
		onClickSlot(`${selectedDate}T${h}:00:00`)
	}

	const hasAllDay = allDayEvents.length > 0

	return (
		<div className="flex flex-1 flex-col" data-testid="day-view">
			{/* All-day event header */}
			{hasAllDay && (
				<div className="flex border-b border-outline-variant/20">
					<div
						style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
						className="flex items-center justify-end pr-2"
					>
						<span className="text-label text-on-surface-muted">All day</span>
					</div>
					<div className="flex flex-1 flex-col gap-0.5 border-l border-outline-variant/20 px-2 py-1">
						{allDayEvents.map((event) => {
							const colorClass =
								EVENT_COLOR_MAP[event.state.color ?? 'default'] ?? EVENT_COLOR_MAP.default
							return (
								<button
									type="button"
									key={event.id}
									className={`w-full truncate rounded-xs px-2 py-0.5 text-left text-label text-on-primary ${colorClass}`}
									onClick={() => onClickEvent(event.id)}
									aria-label={`${event.state.title}, all day`}
								>
									{event.state.title}
								</button>
							)
						})}
					</div>
				</div>
			)}

			{/* Scrollable time grid */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto scroll-fade">
				<div className="relative flex" style={{ height: 24 * HOUR_HEIGHT }}>
					{/* Time gutter */}
					<div
						className="sticky left-0 z-20 bg-surface"
						style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
					>
						{HOURS.map((hour) => (
							<div
								key={hour}
								className="absolute right-2 text-label text-on-surface-muted"
								style={{ top: hour * HOUR_HEIGHT - 6 }}
							>
								{hour > 0 ? formatHour(hour) : ''}
							</div>
						))}
					</div>

					{/* Single day column */}
					<div className="relative flex-1 border-l border-outline-variant/20">
						{/* Hour grid lines */}
						{HOURS.map((hour) => (
							<button
								type="button"
								key={hour}
								className="absolute right-0 left-0 border-t border-outline-variant/10 hover:bg-surface/50"
								style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
								onClick={() => handleSlotClick(hour)}
								aria-label={`${selectedDate} ${formatHour(hour)}`}
							/>
						))}

						{/* Current time line */}
						{today && <CurrentTimeLine />}

						{/* Event blocks — wider than week view */}
						{layoutEvents.map((event) => (
							<TimeGridEventBlock
								key={event.id}
								event={event}
								dayDate={selectedDate}
								onClickEvent={onClickEvent}
								compact={false}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
