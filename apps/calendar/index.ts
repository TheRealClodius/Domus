import { Calendar } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'
import { reduce, summarize } from '@/apps/calendar/reduce'

const CalendarApp = dynamic(() => import('@/apps/calendar/CalendarApp'))
const CalendarViewSwitcher = dynamic(() => import('@/apps/calendar/CalendarViewSwitcher'))

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
	description:
		'Monthly/weekly/day/agenda calendar with Google Calendar integration. Events are fetched live — not stored as entities. Use call_entity_tool to change view or navigate to a date.',
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
