'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
	getDayName,
	getEventDays,
	getMonthGridDays,
	isToday,
	MONTH_NAMES,
	toDateString,
} from '@/apps/calendar/dateUtils'
import { EVENT_COLOR_MAP } from '@/apps/calendar/eventLayout'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

function EventDot({ event }: { event: CalendarEvent }) {
	const glowing = useAgentGlow({ created_by: event.created_by, updated_at: event.updated_at })
	const colorKey = event.state.color ?? 'default'
	const color = colorKey === 'default' ? 'bg-on-surface-muted' : EVENT_COLOR_MAP[colorKey]

	return (
		<span
			className={`size-1.5 rounded-full ${color} ${glowing ? 'motion-safe:animate-pulse' : ''}`}
		/>
	)
}

/** Get only the weeks that contain at least one day of the target month */
function getCompactWeeks(year: number, month: number): Date[][] {
	const allDays = getMonthGridDays(year, month)
	const weeks: Date[][] = []
	for (let i = 0; i < allDays.length; i += 7) {
		const week = allDays.slice(i, i + 7)
		if (week.some((d) => d.getMonth() === month)) {
			weeks.push(week)
		}
	}
	return weeks
}

interface MonthViewProps {
	year: number
	selectedDate: string
	events: CalendarEvent[]
	onSelectDay: (date: string) => void
}

export default function MonthView({ year, selectedDate, events, onSelectDay }: MonthViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null)
	const monthRefs = useRef<(HTMLDivElement | null)[]>([])

	const eventsByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {}
		for (const event of events) {
			for (const dayKey of getEventDays(event.state.start, event.state.end)) {
				if (!map[dayKey]) map[dayKey] = []
				map[dayKey].push(event)
			}
		}
		return map
	}, [events])

	// Auto-scroll to the selected month on mount / year change
	const selectedMonth = new Date(`${selectedDate}T00:00:00`).getMonth()
	// biome-ignore lint/correctness/useExhaustiveDependencies: year change means new grids — must re-scroll
	useEffect(() => {
		const el = monthRefs.current[selectedMonth]
		if (el) {
			el.scrollIntoView({ block: 'start' })
		}
	}, [year, selectedMonth])

	const handleKeyDown = useCallback(
		(monthIndex: number, dayIndex: number, totalDays: number) => (e: React.KeyboardEvent) => {
			const keyMap: Record<string, number> = {
				ArrowRight: dayIndex + 1,
				ArrowLeft: dayIndex - 1,
				ArrowDown: dayIndex + 7,
				ArrowUp: dayIndex - 7,
			}
			const next = keyMap[e.key]
			if (next !== undefined && next >= 0 && next < totalDays) {
				e.preventDefault()
				const grid = monthRefs.current[monthIndex]
				const buttons = grid?.querySelectorAll<HTMLButtonElement>('[role="gridcell"]')
				buttons?.[next]?.focus()
			}
		},
		[],
	)

	return (
		<div ref={scrollRef} className="flex-1 overflow-y-auto scroll-fade" data-testid="month-view">
			{Array.from({ length: 12 }, (_, monthIndex) => {
				const weeks = getCompactWeeks(year, monthIndex)
				const totalCells = weeks.length * 7

				return (
					<div
						key={MONTH_NAMES[monthIndex]}
						ref={(el) => {
							monthRefs.current[monthIndex] = el
						}}
					>
						{/* Sticky month label */}
						<h3 className="sticky top-0 z-10 bg-surface px-3 py-1.5 font-display text-title-xs text-on-surface">
							{MONTH_NAMES[monthIndex]}
						</h3>

						{/* Day headers */}
						{/* biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not a table */}
						{/* biome-ignore lint/a11y/useFocusableInteractive: header row is not interactive */}
						<div className="grid grid-cols-7" role="row">
							{Array.from({ length: 7 }, (_, i) => (
								// biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not a table
								// biome-ignore lint/a11y/useFocusableInteractive: column headers are not interactive
								<div
									key={getDayName(i)}
									role="columnheader"
									className="py-1 text-center text-label text-on-surface-muted"
								>
									{getDayName(i)}
								</div>
							))}
						</div>

						{/* Day grid — compact rows */}
						{/* biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not a table */}
						<div role="grid" className="grid grid-cols-7">
							{weeks.flatMap((week, weekIdx) =>
								week.map((day, dayIdx) => {
									const flatIdx = weekIdx * 7 + dayIdx
									const isCurrentMonth = day.getMonth() === monthIndex

									if (!isCurrentMonth) {
										return (
											<div key={toDateString(day)} className="border-t border-outline/20 pt-1" />
										)
									}

									const dateStr = toDateString(day)
									const today = isToday(day)
									const dayEvents = eventsByDay[dateStr] ?? []
									const visibleDots = dayEvents.slice(0, 3)
									const overflow = dayEvents.length - 3
									const eventCount = dayEvents.length
									const label = `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}${eventCount > 0 ? `, ${eventCount} event${eventCount === 1 ? '' : 's'}` : ''}`

									return (
										// biome-ignore lint/a11y/useSemanticElements: CSS grid layout, not a table
										<button
											key={dateStr}
											type="button"
											role="gridcell"
											aria-label={label}
											tabIndex={flatIdx === 0 ? 0 : -1}
											className="flex flex-col items-center gap-0.5 border-t border-outline/20 pt-1 hover:bg-surface-sunken"
											onClick={() => onSelectDay(dateStr)}
											onKeyDown={handleKeyDown(monthIndex, flatIdx, totalCells)}
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
														<span className="text-label text-on-surface-muted">+{overflow}</span>
													)}
												</div>
											)}
										</button>
									)
								}),
							)}
						</div>
					</div>
				)
			})}
		</div>
	)
}
