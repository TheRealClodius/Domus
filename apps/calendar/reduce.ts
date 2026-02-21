import { MONTH_NAMES } from '@/apps/calendar/dateUtils'
import {
	type CalendarState,
	type CalendarView,
	DEFAULT_CALENDAR_STATE,
} from '@/apps/calendar/types'

export function reduce(
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

export function summarize(state: Record<string, unknown>): string {
	const cal = (state.view ? state : DEFAULT_CALENDAR_STATE) as CalendarState
	const date = new Date(`${cal.selected_date}T00:00:00`)
	const month = MONTH_NAMES[date.getMonth()]
	const year = date.getFullYear()
	return `Calendar — ${month} ${year} (${cal.view})`
}
