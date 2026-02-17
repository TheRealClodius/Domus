/** Get the first day of the month grid (Monday of the week containing the 1st) */
export function getMonthGridStart(year: number, month: number): Date {
	const first = new Date(year, month, 1)
	// getDay() returns 0=Sun, we want 0=Mon
	const dayOfWeek = (first.getDay() + 6) % 7
	const start = new Date(first)
	start.setDate(first.getDate() - dayOfWeek)
	return start
}

/** Get 42 days (6 weeks) starting from the grid start */
export function getMonthGridDays(year: number, month: number): Date[] {
	const start = getMonthGridStart(year, month)
	const days: Date[] = []
	for (let i = 0; i < 42; i++) {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		days.push(d)
	}
	return days
}

/** Format date as ISO date string (YYYY-MM-DD) */
export function toDateString(date: Date): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/** Check if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	)
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
	return isSameDay(date, new Date())
}

/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
	const d = new Date(date)
	const dayOfWeek = (d.getDay() + 6) % 7
	d.setDate(d.getDate() - dayOfWeek)
	return d
}

/** Get 7 days starting from a date */
export function getWeekDays(start: Date): Date[] {
	const days: Date[] = []
	for (let i = 0; i < 7; i++) {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		days.push(d)
	}
	return days
}

/** Monday-first (0=Mon … 6=Sun). Consumed via `(getDay()+6)%7` to convert JS's Sunday-first index. */
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function getDayName(dayIndex: number): string {
	return SHORT_DAYS[dayIndex]
}

/** Format hour for time gutter (e.g., "9 AM", "12 PM") */
export function formatHour(hour: number): string {
	if (hour === 0) return '12 AM'
	if (hour < 12) return `${hour} AM`
	if (hour === 12) return '12 PM'
	return `${hour - 12} PM`
}

export const MONTH_NAMES = [
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

/** Sunday-first (0=Sun … 6=Sat), matching JS `getDay()` natively. */
export const DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
]

/** Return array of YYYY-MM-DD strings the event spans (inclusive) */
export function getEventDays(start: string, end: string): string[] {
	const days: string[] = []
	const s = new Date(start)
	const e = new Date(end)
	// Normalize to date-only for comparison
	const current = new Date(s.getFullYear(), s.getMonth(), s.getDate())
	const last = new Date(e.getFullYear(), e.getMonth(), e.getDate())
	// If end is exactly midnight, don't include that day
	if (e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0 && current < last) {
		last.setDate(last.getDate() - 1)
	}
	while (current <= last) {
		days.push(toDateString(current))
		current.setDate(current.getDate() + 1)
	}
	return days
}

/** Format time string (HH:MM) from ISO datetime */
export function formatTime(iso: string): string {
	const date = new Date(iso)
	const h = date.getHours()
	const m = date.getMinutes()
	const ampm = h >= 12 ? 'PM' : 'AM'
	const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
	return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}
