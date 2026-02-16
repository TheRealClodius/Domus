'use client'

import { useEffect, useRef } from 'react'
import { formatHour, formatTime, isToday } from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

const HOUR_HEIGHT = 48
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const GUTTER_WIDTH = 48

interface DayViewProps {
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

function DayEventBlock({
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
			className={`absolute right-2 left-2 z-10 cursor-pointer overflow-hidden rounded-xs border-l-[3px] bg-surface-sunken px-2 py-1 text-left transition-[border-color] duration-[2.5s] ${borderColor}`}
			style={{ top, height }}
			onClick={(e) => {
				e.stopPropagation()
				onClickEvent(event.id)
			}}
		>
			<span className="text-label text-on-surface">{event.state.title}</span>
			<span className="ml-2 text-label text-on-surface-muted">{formatTime(event.state.start)}</span>
		</button>
	)
}

export default function DayView({ selectedDate, events, onClickSlot, onClickEvent }: DayViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const today = isToday(new Date(`${selectedDate}T00:00:00`))

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

	return (
		<div className="flex flex-1 flex-col" data-testid="day-view">
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

					{/* Single day column */}
					<div className="relative flex-1 border-l border-outline/20">
						{/* Hour grid lines */}
						{HOURS.map((hour) => (
							<button
								type="button"
								key={hour}
								className="absolute right-0 left-0 border-t border-outline/10 hover:bg-surface-sunken/50"
								style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
								onClick={() => handleSlotClick(hour)}
								aria-label={`${selectedDate} ${formatHour(hour)}`}
							/>
						))}

						{/* Current time line */}
						{today && (
							<div
								className="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-primary"
								style={{
									top: (new Date().getHours() + new Date().getMinutes() / 60) * HOUR_HEIGHT,
								}}
								data-testid="current-time-line"
							/>
						)}

						{/* Event blocks — wider than week view */}
						{events.map((event) => (
							<DayEventBlock key={event.id} event={event} onClickEvent={onClickEvent} />
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
