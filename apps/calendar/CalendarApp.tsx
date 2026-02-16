'use client'

import { Calendar } from 'lucide-react'
import type { AppProps } from '@/apps/_types'

export default function CalendarApp({ entityId: _entityId }: AppProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
			<Calendar className="size-8 text-on-surface-muted" />
			<p className="text-sm font-medium text-on-surface">February 2026</p>
			<p className="text-sm text-on-surface-muted">Calendar events will appear here</p>
		</div>
	)
}
