import { Calendar } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import CalendarApp from '@/apps/calendar/CalendarApp'
import {
	type CalendarState,
	type CalendarView,
	DEFAULT_CALENDAR_STATE,
} from '@/apps/calendar/types'

function reduce(
	state: Record<string, unknown>,
	action: string,
	params: unknown,
): Record<string, unknown> {
	const cal = (state.view ? state : { ...DEFAULT_CALENDAR_STATE }) as CalendarState
	const p = params as Record<string, unknown>

	switch (action) {
		case 'set_view':
			return { ...cal, view: p.view as CalendarView }
		case 'set_date':
			return { ...cal, selected_date: p.date as string }
		default:
			return state
	}
}

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

function summarize(state: Record<string, unknown>): string {
	const cal = (state.view ? state : DEFAULT_CALENDAR_STATE) as CalendarState
	const date = new Date(`${cal.selected_date}T00:00:00`)
	const month = MONTH_NAMES[date.getMonth()]
	const year = date.getFullYear()
	return `Calendar — ${month} ${year} (${cal.view})`
}

export const calendarApp: BuiltInApp = {
	source: 'built-in',
	type: 'calendar',
	name: 'Calendar',
	icon: Calendar,
	component: CalendarApp,
	defaultPresentation: 'window',
	defaultSize: { width: 600, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
}
