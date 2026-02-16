'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/core/supabase/client'

interface GuestSessionBootstrapProps {
	hasSession?: boolean
}

export default function GuestSessionBootstrap({ hasSession }: GuestSessionBootstrapProps) {
	const router = useRouter()
	const started = useRef(false)

	useEffect(() => {
		if (started.current) return
		started.current = true

		async function bootstrap() {
			const supabase = getSupabaseBrowserClient()

			if (!hasSession) {
				// TODO: Add Cloudflare Turnstile (invisible mode) to prevent bot abuse on anonymous sign-ins.
				// Supabase rate-limits at 30/hr per IP and pg_cron cleans up after 14 days,
				// but Turnstile adds proactive bot detection without affecting real user UX.
				const { error } = await supabase.auth.signInAnonymously()
				if (error) {
					console.error('Anonymous sign-in failed:', error.message)
					return
				}
			}

			const res = await fetch('/api/space/create', { method: 'POST' })
			if (!res.ok) {
				console.error('Space creation failed:', res.status)
				return
			}

			const { space_id } = await res.json()
			router.replace(`/space/${space_id}`)
		}

		bootstrap()
	}, [hasSession, router])

	return (
		<div className="flex h-screen items-center justify-center bg-surface">
			<p className="text-on-surface-muted animate-pulse">Setting up your space...</p>
		</div>
	)
}
