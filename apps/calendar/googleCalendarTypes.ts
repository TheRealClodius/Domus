/** Shape returned by the Google Calendar API v3 events list endpoint. */
export interface GoogleCalendarEventRaw {
	id: string
	summary?: string
	start: { dateTime?: string; date?: string; timeZone?: string }
	end: { dateTime?: string; date?: string; timeZone?: string }
	colorId?: string
	htmlLink?: string
	attendees?: GoogleCalendarAttendee[]
}

export interface GoogleCalendarAttendee {
	email: string
	displayName?: string
	responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
	organizer?: boolean
	self?: boolean
}
