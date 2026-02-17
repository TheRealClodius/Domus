import type { ReactNode } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/core/ui/button'
import { useSheetStore } from '@/core/sheetStore'

interface ChatAuthGateProps {
	isAuthenticated: boolean
	children: ReactNode
}

export default function ChatAuthGate({ isAuthenticated, children }: ChatAuthGateProps) {
	if (isAuthenticated) {
		return <>{children}</>
	}

	return (
		<div className="flex flex-col items-center justify-center gap-4 p-6 text-center h-full">
			<MessageSquare className="size-10 text-on-surface-muted" />
			<div className="space-y-1">
				<p className="text-body font-medium text-on-surface">Sign in to chat</p>
				<p className="text-body-sm text-on-surface-muted">
					Create groups, send messages, and chat with others.
				</p>
			</div>
			<Button
				variant="pill-base"
				size="pill-lg"
				onClick={() => useSheetStore.getState().open(null, 'login')}
			>
				Log in
			</Button>
		</div>
	)
}
