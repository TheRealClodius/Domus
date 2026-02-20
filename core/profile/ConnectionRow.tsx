'use client'

import { Button } from '@/core/ui/button'

interface ConnectionRowProps {
	icon: React.ReactNode
	name: string
	isConnected: boolean
	isLoading: boolean
	onConnect: () => void
	onDisconnect: () => void
}

export default function ConnectionRow({
	icon,
	name,
	isConnected,
	isLoading,
	onConnect,
	onDisconnect,
}: ConnectionRowProps) {
	return (
		<div
			data-testid={`connection-${name.toLowerCase().replace(/\s+/g, '-')}`}
			className="flex items-center gap-3 rounded-lg px-3 py-2.5"
		>
			<span className="flex size-5 shrink-0 items-center justify-center text-on-surface-muted">
				{icon}
			</span>
			<span className="flex-1 text-body text-on-surface">{name}</span>
			{isLoading ? (
				<span className="text-label text-on-surface-muted">…</span>
			) : isConnected ? (
				<Button variant="ghost" size="xs" onClick={onDisconnect}>
					Disconnect
				</Button>
			) : (
				<Button variant="ghost" size="xs" onClick={onConnect}>
					Connect
				</Button>
			)}
		</div>
	)
}
