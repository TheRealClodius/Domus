'use client'

import { isToday } from '@/apps/calendar/dateUtils'
import type { CalendarView } from '@/apps/calendar/types'
import { Button } from '@/core/ui/button'

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

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
	{ value: 'month', label: 'M' },
	{ value: 'week', label: 'W' },
	{ value: 'day', label: 'D' },
	{ value: 'agenda', label: 'A' },
]

interface CalendarHeaderProps {
	view: CalendarView
	selectedDate: string
	onChangeView: (view: CalendarView) => void
	onNavigate: (direction: -1 | 1) => void
	onToday: () => void
}

function getPeriodLabel(view: CalendarView, selectedDate: string): string {
	const date = new Date(`${selectedDate}T00:00:00`)
	const month = MONTH_NAMES[date.getMonth()]
	const year = date.getFullYear()

	if (view === 'month') return `${month} ${year}`
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
	onChangeView,
	onNavigate,
	onToday,
}: CalendarHeaderProps) {
	const showTodayButton = !isToday(new Date(`${selectedDate}T00:00:00`))

	return (
		<div className="flex items-center justify-between px-3 py-2">
			{/* Left: navigation */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					className="flex size-7 items-center justify-center rounded text-on-surface-muted hover:bg-surface-sunken"
					onClick={() => onNavigate(-1)}
					aria-label="Previous"
				>
					◂
				</button>
				<span className="min-w-32 text-center font-display text-title-xs text-on-surface">
					{getPeriodLabel(view, selectedDate)}
				</span>
				<button
					type="button"
					className="flex size-7 items-center justify-center rounded text-on-surface-muted hover:bg-surface-sunken"
					onClick={() => onNavigate(1)}
					aria-label="Next"
				>
					▸
				</button>
			</div>

			{/* Right: today + view switcher */}
			<div className="flex items-center gap-3">
				{showTodayButton && (
					<Button variant="ghost" size="xs" onClick={onToday}>
						Today
					</Button>
				)}
				<div className="flex gap-1">
					{VIEW_OPTIONS.map((opt) => (
						<Button
							key={opt.value}
							variant={view === opt.value ? 'pill-active' : 'pill-secondary'}
							size="pill"
							onClick={() => onChangeView(opt.value)}
						>
							{opt.label}
						</Button>
					))}
				</div>
			</div>
		</div>
	)
}
