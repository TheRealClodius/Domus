'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { isToday, MONTH_NAMES } from '@/apps/calendar/dateUtils'
import type { CalendarView } from '@/apps/calendar/types'
import { Button } from '@/core/ui/button'

interface CalendarHeaderProps {
	view: CalendarView
	selectedDate: string
	onNavigate: (direction: -1 | 1) => void
	onToday: () => void
	trailing?: React.ReactNode
}

function getPeriodLabel(view: CalendarView, selectedDate: string): string {
	const date = new Date(`${selectedDate}T00:00:00`)
	const month = MONTH_NAMES[date.getMonth()]
	const year = date.getFullYear()

	if (view === 'month') return `${year}`
	if (view === 'agenda') return `${month} ${year}`

	if (view === 'week') {
		// Show "Feb 16 – 22, 2026" style
		const dayOfWeek = (date.getDay() + 6) % 7
		const weekStart = new Date(date)
		weekStart.setDate(date.getDate() - dayOfWeek)
		const weekEnd = new Date(weekStart)
		weekEnd.setDate(weekStart.getDate() + 6)

		const startMonth = MONTH_NAMES[weekStart.getMonth()].slice(0, 3)
		const endMonth = MONTH_NAMES[weekEnd.getMonth()].slice(0, 3)

		if (weekStart.getMonth() === weekEnd.getMonth()) {
			return `${startMonth} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${year}`
		}
		return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${year}`
	}

	// day view
	const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
	return `${dayOfWeek}, ${month.slice(0, 3)} ${date.getDate()}, ${year}`
}

export default function CalendarHeader({
	view,
	selectedDate,
	onNavigate,
	onToday,
	trailing,
}: CalendarHeaderProps) {
	const showTodayButton = !isToday(new Date(`${selectedDate}T00:00:00`))

	return (
		<div className="flex items-center gap-1 px-3 py-2">
			<Button
				variant="pill-secondary"
				size="pill"
				onClick={() => onNavigate(-1)}
				aria-label="Previous"
			>
				<ChevronLeft />
			</Button>
			<span className="min-w-32 text-center font-display text-title-xs text-on-surface">
				{getPeriodLabel(view, selectedDate)}
			</span>
			<Button variant="pill-secondary" size="pill" onClick={() => onNavigate(1)} aria-label="Next">
				<ChevronRight />
			</Button>
			{showTodayButton && (
				<Button variant="ghost" size="xs" onClick={onToday}>
					Today
				</Button>
			)}
			{trailing}
		</div>
	)
}
