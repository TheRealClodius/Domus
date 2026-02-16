'use client'

import { MessageSquare } from 'lucide-react'
import type { AppProps } from '@/apps/_types'

export default function ChatApp({ entityId: _entityId }: AppProps) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
			<MessageSquare className="size-8 text-on-surface-muted" />
			<p className="text-sm text-on-surface-muted">Chat messages will appear here</p>
		</div>
	)
}
