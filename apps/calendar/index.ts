import { Calendar } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import CalendarApp from '@/apps/calendar/CalendarApp'

export const calendarApp: BuiltInApp = {
	source: 'built-in',
	type: 'calendar',
	name: 'Calendar',
	icon: Calendar,
	component: CalendarApp,
	defaultPresentation: 'window',
	defaultSize: { width: 500, height: 450 },
	maxInstances: 1,
	reduce: (state) => state,
	summarize: () => 'Calendar',
}
