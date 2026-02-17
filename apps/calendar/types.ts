export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export type EventColor = 'default' | 'warm' | 'cool' | 'muted'

export type EventSource = 'local' | 'google'

export interface CalendarState {
	view: CalendarView
	selected_date: string // ISO date string (YYYY-MM-DD)
}

export interface EventAttendee {
	email: string
	displayName?: string
	responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
	organizer?: boolean
	self?: boolean
}

export interface CalendarEventState {
	title: string
	start: string // ISO 8601 datetime
	end: string // ISO 8601 datetime
	all_day: boolean
	color?: EventColor
	recurrence?: { rule: 'daily' | 'weekly' | 'monthly' | 'yearly'; parent_id: string }
	reminder?: { minutes_before: number }
	attendees?: EventAttendee[]
}

export const DEFAULT_CALENDAR_STATE: CalendarState = {
	view: 'month',
	selected_date: new Date().toISOString().split('T')[0],
}

// TODO: timezone support — store tz on events, use Temporal API or date-fns-tz for display
