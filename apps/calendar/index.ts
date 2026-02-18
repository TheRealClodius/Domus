import { Calendar } from 'lucide-react'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'
import CalendarApp from '@/apps/calendar/CalendarApp'
import CalendarViewSwitcher from '@/apps/calendar/CalendarViewSwitcher'
import { MONTH_NAMES } from '@/apps/calendar/dateUtils'
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

function summarize(state: Record<string, unknown>): string {
	const cal = (state.view ? state : DEFAULT_CALENDAR_STATE) as CalendarState
	const date = new Date(`${cal.selected_date}T00:00:00`)
	const month = MONTH_NAMES[date.getMonth()]
	const year = date.getFullYear()
	return `Calendar — ${month} ${year} (${cal.view})`
}

// SPIKE: entity-as-mcp — static schema, 2 tools always available
function getSchema(_state: Record<string, unknown>): ToolSchema[] {
	return [
		{
			name: 'set_view',
			description: 'Switch the calendar view mode',
			inputSchema: {
				type: 'object',
				properties: {
					view: {
						type: 'string',
						enum: ['month', 'week', 'day', 'agenda'],
						description: 'The calendar view to switch to',
					},
				},
				required: ['view'],
			},
		},
		{
			name: 'set_date',
			description: 'Navigate the calendar to a specific date',
			inputSchema: {
				type: 'object',
				properties: {
					date: {
						type: 'string',
						description: 'The date to navigate to (YYYY-MM-DD)',
					},
				},
				required: ['date'],
			},
		},
	]
}

export const calendarApp: BuiltInApp = {
	source: 'built-in',
	type: 'calendar',
	name: 'Calendar',
	icon: Calendar,
	component: CalendarApp,
	windowActions: CalendarViewSwitcher,
	defaultPresentation: 'window',
	defaultSize: { width: 600, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
	getSchema,
}
