'use client'

import { type ReactNode, useEffect, useState } from 'react'
import DesktopOnlyPlaceholder from '@/core/platform/DesktopOnlyPlaceholder'
import { isDesktopViewport } from '@/lib/platform'

export default function DesktopOnlyGate({ children }: { children: ReactNode }) {
	const [allowed, setAllowed] = useState<boolean | null>(null)

	useEffect(() => {
		const check = () => {
			setAllowed(isDesktopViewport(window.innerWidth, window.innerHeight))
		}
		check()
		window.addEventListener('resize', check)
		return () => window.removeEventListener('resize', check)
	}, [])

	if (allowed === null) return null
	if (!allowed) return <DesktopOnlyPlaceholder />
	return children
}
