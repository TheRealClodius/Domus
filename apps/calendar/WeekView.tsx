'use client'

import { useEffect, useMemo, useRef } from 'react'
import {
	formatHour,
	getDayName,
	getEventDays,
	getWeekDays,
	getWeekStart,
	isToday,
	toDateString,
} from '@/apps/calendar/dateUtils'
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

interface WeekViewProps {
	selectedDate: string
	events: CalendarEvent[]
	onClickSlot: (dateTime: string) => void
	onClickEvent: (eventId: string) => void
}

export default function WeekView({
	selectedDate,
	events,
	onClickSlot,
	onClickEvent,
}: WeekViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const days = useMemo(() => {
		const date = new Date(`${selectedDate}T00:00:00`)
		return getWeekDays(getWeekStart(date))
	}, [selectedDate])

	const allDayEvents = useMemo(() => events.filter((e) => e.state.all_day), [events])

	const timedEvents = useMemo(() => events.filter((e) => !e.state.all_day), [events])

	const eventsByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {}
		for (const event of timedEvents) {
			const dayKeys = getEventDays(event.state.start, event.state.end)
			for (const dayKey of dayKeys) {
				if (!map[dayKey]) map[dayKey] = []
				map[dayKey].push(event)
			}
		}
		return map
	}, [timedEvents])

	const allDayByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {}
		for (const event of allDayEvents) {
			const dayKeys = getEventDays(event.state.start, event.state.end)
			for (const dayKey of dayKeys) {
				if (!map[dayKey]) map[dayKey] = []
				map[dayKey].push(event)
			}
		}
		return map
	}, [allDayEvents])

	// Auto-scroll to current hour on mount
	useEffect(() => {
		const el = scrollRef.current
		if (!el) return
		const now = new Date()
		const targetScroll = Math.max((now.getHours() - 1) * HOUR_HEIGHT, 0)
		el.scrollTo?.({ top: targetScroll, behavior: 'smooth' })
	}, [])

	const handleSlotClick = (day: Date, hour: number) => {
		const d = toDateString(day)
		const h = String(hour).padStart(2, '0')
		onClickSlot(`${d}T${h}:00:00`)
	}

	const hasAllDay = allDayEvents.length > 0

	return (
		<div className="flex flex-1 flex-col" data-testid="week-view">
			{/* Column headers */}
			<div className="flex border-b border-outline/20">
				<div style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }} />
				{days.map((day) => {
					const today = isToday(day)
					return (
						<div key={toDateString(day)} className="flex flex-1 flex-col items-center py-1">
							<span className={`text-label ${today ? 'text-primary' : 'text-on-surface-muted'}`}>
								{getDayName((day.getDay() + 6) % 7)}
							</span>
							<span className={`text-body ${today ? 'text-primary' : 'text-on-surface'}`}>
								{day.getDate()}
							</span>
						</div>
					)
				})}
			</div>

			{/* All-day event header */}
			{hasAllDay && (
				<div className="flex border-b border-outline/20">
					<div
						style={{ width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
						className="flex items-center justify-end pr-2"
					>
						<span className="text-label text-on-surface-muted">All day</span>
					</div>
					{days.map((day) => {
						const dateStr = toDateString(day)
						const dayAllDay = allDayByDay[dateStr] ?? []
						return (
							<div
								key={dateStr}
								className="flex flex-1 flex-col gap-0.5 border-l border-outline/20 px-1 py-1"
							>
								{dayAllDay.map((event) => {
									const colorClass =
										EVENT_COLOR_MAP[event.state.color ?? 'default'] ?? EVENT_COLOR_MAP.default
									return (
										<button
											type="button"
											key={event.id}
											className={`w-full truncate rounded-xs px-1.5 py-0.5 text-left text-label text-on-primary ${colorClass}`}
											onClick={() => onClickEvent(event.id)}
											aria-label={`${event.state.title}, all day`}
										>
											{event.state.title}
										</button>
									)
								})}
							</div>
						)
					})}
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

					{/* Day columns */}
					{days.map((day) => {
						const dateStr = toDateString(day)
						const dayEvents = eventsByDay[dateStr] ?? []
						const layoutEvents = computeOverlapColumns(dayEvents)
						const today = isToday(day)

						return (
							<div key={dateStr} className="relative flex-1 border-l border-outline/20">
								{/* Hour grid lines */}
								{HOURS.map((hour) => (
									<button
										type="button"
										key={hour}
										className="absolute right-0 left-0 border-t border-outline/10 hover:bg-surface-sunken/50"
										style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
										onClick={() => handleSlotClick(day, hour)}
										aria-label={`${dateStr} ${formatHour(hour)}`}
									/>
								))}

								{/* Current time line */}
								{today && <CurrentTimeLine />}

								{/* Event blocks */}
								{layoutEvents.map((event) => (
									<TimeGridEventBlock
										key={event.id}
										event={event}
										dayDate={dateStr}
										onClickEvent={onClickEvent}
									/>
								))}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
