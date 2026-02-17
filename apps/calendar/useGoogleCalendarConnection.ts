'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/core/supabase/client'

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
		const supabase = getSupabaseBrowserClient()
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback?calendar_connect=true`,
				scopes: 'https://www.googleapis.com/auth/calendar.readonly',
				queryParams: {
					access_type: 'offline',
					prompt: 'consent',
					include_granted_scopes: 'true',
				},
			},
		})

		if (error) {
			console.error('Google Calendar connect error:', error.message)
			return
		}

		if (data.url) {
			window.location.href = data.url
		}
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
