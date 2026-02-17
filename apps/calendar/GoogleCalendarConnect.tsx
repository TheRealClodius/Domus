'use client'

import { useGoogleCalendarConnection } from '@/apps/calendar/useGoogleCalendarConnection'
import { Button } from '@/core/ui/button'

export default function GoogleCalendarConnect() {
	const { isConnected, isLoading, connect, disconnect } = useGoogleCalendarConnection()

	if (isLoading) return null

	if (isConnected) {
		return (
			<Button variant="ghost" size="xs" onClick={disconnect}>
				Disconnect Google Calendar
			</Button>
		)
	}

	return (
		<Button variant="ghost" size="xs" onClick={connect}>
			Connect Google Calendar
		</Button>
	)
}
