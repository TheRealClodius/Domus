'use client'

import { useCallback, useEffect, useState } from 'react'

export interface GoogleCalendarConnection {
	isConnected: boolean
	isLoading: boolean
	connect: () => Promise<void>
	disconnect: () => Promise<void>
}

export function useGoogleCalendarConnection(): GoogleCalendarConnection {
	const [isConnected, setIsConnected] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const check = async () => {
			try {
				const res = await fetch('/api/google-calendar/status')
				if (res.ok) {
					const data = await res.json()
					setIsConnected(data.connected)
				}
			} catch {
				// Assume not connected
			} finally {
				setIsLoading(false)
			}
		}
		check()
	}, [])

	const connect = useCallback(async () => {
		const returnTo = `${window.location.pathname}${window.location.search}`
		window.location.href = `/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`
	}, [])

	const disconnect = useCallback(async () => {
		try {
			const res = await fetch('/api/google-calendar/disconnect', { method: 'POST' })
			if (res.ok) {
				setIsConnected(false)
			}
		} catch (err) {
			console.error('Disconnect failed:', err)
		}
	}, [])

	return { isConnected, isLoading, connect, disconnect }
}
