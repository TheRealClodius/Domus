'use client'

import { useEffect, useState } from 'react'
import { formatTime } from '@/apps/calendar/dateUtils'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

export const HOUR_HEIGHT = 48
export const GUTTER_WIDTH = 48

export const EVENT_COLOR_MAP: Record<string, string> = {
	default: 'bg-primary',
	warm: 'bg-agent',
	cool: 'bg-primary',
	muted: 'bg-on-surface-muted',
}

export const EVENT_BORDER_MAP: Record<string, string> = {
	default: 'border-l-primary',
	warm: 'border-l-agent',
	cool: 'border-l-primary',
	muted: 'border-l-on-surface-muted',
}

export function getEventPosition(
	event: CalendarEvent,
	dayDate?: string,
): { top: number; height: number } {
	let start = new Date(event.state.start)
	let end = new Date(event.state.end)

	if (dayDate) {
		const dayStart = new Date(`${dayDate}T00:00:00`)
		const dayEnd = new Date(`${dayDate}T23:59:59.999`)
		if (start < dayStart) start = dayStart
		if (end > dayEnd) end = new Date(dayEnd.getTime() + 1) // push to exactly midnight
	}

	const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
	const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
	const height = Math.max(duration * HOUR_HEIGHT, HOUR_HEIGHT / 2)
	return { top, height }
}

export function getBorderColor(color: string): string {
	return EVENT_BORDER_MAP[color] ?? 'border-l-primary'
}

export type EventWithLayout = CalendarEvent & { column: number; totalColumns: number }

/** Greedy column assignment for overlapping events in a time grid.
 *  Events are split into connected overlap groups first so a lone event
 *  at 5 PM isn't forced to share width with a 3-way overlap at 9 AM. */
export function computeOverlapColumns(events: CalendarEvent[]): EventWithLayout[] {
	if (events.length === 0) return []

	const sorted = [...events].sort((a, b) => a.state.start.localeCompare(b.state.start))

	// 1. Split into connected overlap groups
	const groups: CalendarEvent[][] = []
	let currentGroup: CalendarEvent[] = [sorted[0]]
	let groupMaxEnd = sorted[0].state.end

	for (let i = 1; i < sorted.length; i++) {
		const event = sorted[i]
		if (event.state.start < groupMaxEnd) {
			// Overlaps with current group
			currentGroup.push(event)
			if (event.state.end > groupMaxEnd) groupMaxEnd = event.state.end
		} else {
			groups.push(currentGroup)
			currentGroup = [event]
			groupMaxEnd = event.state.end
		}
	}
	groups.push(currentGroup)

	// 2. Assign columns within each group independently
	const result: EventWithLayout[] = []

	for (const group of groups) {
		const columns: string[] = []
		const assignments: { event: CalendarEvent; column: number }[] = []

		for (const event of group) {
			let placed = false
			for (let col = 0; col < columns.length; col++) {
				if (event.state.start >= columns[col]) {
					columns[col] = event.state.end
					assignments.push({ event, column: col })
					placed = true
					break
				}
			}
			if (!placed) {
				assignments.push({ event, column: columns.length })
				columns.push(event.state.end)
			}
		}

		const totalColumns = columns.length
		for (const { event, column } of assignments) {
			result.push({ ...event, column, totalColumns })
		}
	}

	return result
}

/** Shared current-time indicator for time grids. */
export function CurrentTimeLine() {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 60_000)
		return () => clearInterval(id)
	}, [])

	const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT

	return (
		<div
			className="pointer-events-none absolute right-0 left-0 z-10 h-0.5 bg-primary"
			style={{ top }}
			data-testid="current-time-line"
		/>
	)
}

/** Shared event block for time grids (week & day views).
 *  `compact` (default true) = smaller padding, no time text — used by WeekView.
 *  `compact=false` = larger padding, shows time — used by DayView. */
export function TimeGridEventBlock({
	event,
	dayDate,
	onClickEvent,
	compact = true,
}: {
	event: EventWithLayout
	dayDate?: string
	onClickEvent: (id: string) => void
	compact?: boolean
}) {
	const { top, height } = getEventPosition(event, dayDate)
	const glowing = useAgentGlow({ created_by: event.created_by, updated_at: event.updated_at })
	const borderColor = glowing ? 'border-l-agent' : getBorderColor(event.state.color ?? 'default')
	const padding = compact ? 'px-1.5 py-0.5' : 'px-2 py-1'

	return (
		<button
			type="button"
			className={`absolute z-10 cursor-pointer overflow-hidden rounded-xs border-l-[3px] bg-surface text-left motion-safe:transition-[border-color] motion-safe:duration-[2.5s] ${padding} ${borderColor}`}
			style={{
				top,
				height,
				left: `${(event.column / event.totalColumns) * 100}%`,
				width: `${(1 / event.totalColumns) * 100}%`,
			}}
			onClick={(e) => {
				e.stopPropagation()
				onClickEvent(event.id)
			}}
			aria-label={`${event.state.title}, ${formatTime(event.state.start)} to ${formatTime(event.state.end)}`}
		>
			<span className="line-clamp-1 text-label text-on-surface">{event.state.title}</span>
			{!compact && (
				<span className="ml-2 text-label text-on-surface-muted">
					{formatTime(event.state.start)}
				</span>
			)}
		</button>
	)
}
