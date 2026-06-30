'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { Button } from '@/core/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/core/ui/dialog'

interface SpaceRow {
	id: string
	name: string | null
}

interface SpaceSwitcherProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentSpaceId: string
	userId: string
}

export default function SpaceSwitcher({
	open,
	onOpenChange,
	currentSpaceId,
	userId,
}: SpaceSwitcherProps) {
	const router = useRouter()
	const [spaces, setSpaces] = useState<SpaceRow[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!open) return

		let cancelled = false
		setLoading(true)
		setError(null)

		void getSupabaseBrowserClient()
			.from('spaces')
			.select('id,name')
			.order('created_at')
			.then(({ data, error: fetchError }) => {
				if (cancelled) return
				if (fetchError) {
					setError(fetchError.message)
					setSpaces([])
				} else {
					setSpaces(data ?? [])
				}
				setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [open])

	const handleSelect = useCallback(
		async (spaceId: string) => {
			if (spaceId === currentSpaceId) {
				onOpenChange(false)
				return
			}

			await getSupabaseBrowserClient()
				.from('users')
				.update({ active_space_id: spaceId })
				.eq('id', userId)

			onOpenChange(false)
			router.push(`/space/${spaceId}`)
		},
		[currentSpaceId, onOpenChange, router, userId],
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="space-switcher">
				<DialogHeader>
					<DialogTitle>Switch space</DialogTitle>
					<DialogDescription>Choose a space to open.</DialogDescription>
				</DialogHeader>
				{loading && <p className="text-sm text-on-surface-muted">Loading spaces…</p>}
				{error && <p className="text-sm text-destructive">{error}</p>}
				{!loading && !error && (
					<ul className="flex flex-col gap-1">
						{spaces.map((space) => (
							<li key={space.id}>
								<Button
									variant={space.id === currentSpaceId ? 'secondary' : 'ghost'}
									className="w-full justify-start"
									data-testid={`space-option-${space.id}`}
									onClick={() => void handleSelect(space.id)}
								>
									{space.name ?? 'Untitled'}
								</Button>
							</li>
						))}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	)
}
