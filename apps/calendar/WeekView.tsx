'use client'

import { useEffect, useMemo, useRef } from 'react'
import {
	formatHour,
	getDayName,
	getWeekDays,
	getWeekStart,
	isToday,
	toDateString,
} from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

const HOUR_HEIGHT = 48
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const GUTTER_WIDTH = 48

interface WeekViewProps {
	selectedDate: string
	events: CalendarEvent[]
	onClickSlot: (dateTime: string) => void
	onClickEvent: (eventId: string) => void
}

function getEventPosition(event: CalendarEvent): { top: number; height: number } {
	const start = new Date(event.state.start)
	const end = new Date(event.state.end)
	const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
	const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
	const height = Math.max(duration * HOUR_HEIGHT, HOUR_HEIGHT / 2)
	return { top, height }
}

function getBorderColor(color: string): string {
	if (color === 'warm') return 'border-l-agent'
	if (color === 'cool') return 'border-l-primary'
	if (color === 'muted') return 'border-l-on-surface-muted'
	return 'border-l-primary'
}

function WeekEventBlock({
	event,
	onClickEvent,
}: {
	event: CalendarEvent
	onClickEvent: (id: string) => void
}) {
	const { top, height } = getEventPosition(event)
	const glowing = useAgentGlow({ created_by: event.created_by, updated_at: event.updated_at })
	const borderColor = glowing ? 'border-l-agent' : getBorderColor(event.state.color ?? 'default')

	return (
		<button
			type="button"
			className={`absolute right-1 left-1 z-10 cursor-pointer overflow-hidden rounded-xs border-l-[3px] bg-surface-sunken px-1.5 py-0.5 text-left transition-[border-color] duration-[2.5s] ${borderColor}`}
			style={{ top, height }}
			onClick={(e) => {
				e.stopPropagation()
				onClickEvent(event.id)
			}}
		>
			<span className="line-clamp-1 text-label text-on-surface">{event.state.title}</span>
		</button>
	)
}

function CurrentTimeLine() {
	const now = new Date()
	const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT

	return (
		<div
			className="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-primary"
			style={{ top }}
			data-testid="current-time-line"
		/>
	)
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

	const eventsByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {}
		for (const event of events) {
			const dayKey = event.state.start.slice(0, 10)
			if (!map[dayKey]) map[dayKey] = []
			map[dayKey].push(event)
		}
		return map
	}, [events])

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

			{/* Scrollable time grid */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto">
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
								{dayEvents.map((event) => (
									<WeekEventBlock key={event.id} event={event} onClickEvent={onClickEvent} />
								))}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
