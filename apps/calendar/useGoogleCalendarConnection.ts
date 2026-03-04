'use client'

import { useCallback, useEffect, useState } from 'react'

export interface GoogleCalendarConnection {
	isConnected: boolean
	isLoading: boolean
	connect: () => Promise<void>
	disconnect: () => Promise<void>
}

/** Module-level cache — persists across component mounts within the session. */
let cachedConnected: boolean | null = null

export function useGoogleCalendarConnection(): GoogleCalendarConnection {
	const [isConnected, setIsConnected] = useState(cachedConnected ?? false)
	const [isLoading, setIsLoading] = useState(cachedConnected === null)

	useEffect(() => {
		const check = async () => {
			try {
				const res = await fetch('/api/google-calendar/status')
				if (res.ok) {
					const data = await res.json()
					const next = Boolean(data.connected)
					cachedConnected = next
					setIsConnected((prev) => (prev !== next ? next : prev))
				}
			} catch {
				// Keep cached/current state on network error
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
				cachedConnected = false
				setIsConnected(false)
			}
		} catch (err) {
			console.error('Disconnect failed:', err)
		}
	}, [])

	return { isConnected, isLoading, connect, disconnect }
}
