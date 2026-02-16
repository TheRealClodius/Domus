'use client'

import { ArrowLeftRight, Star } from 'lucide-react'
import { useSheetStore } from '@/core/sheetStore'
import { Button } from '@/core/ui/button'

interface SpaceHeaderProps {
	spaceName: string
	onToggleFavorite?: () => void
	onSwitchSpace?: () => void
}

export default function SpaceHeader({
	spaceName,
	onToggleFavorite,
	onSwitchSpace,
}: SpaceHeaderProps) {
	const openLogin = useSheetStore((s) => s.open)

	return (
		<div data-testid="space-header" className="flex w-full items-center justify-between py-4 px-4">
			<div className="flex items-center gap-2">
				<h1 className="font-display text-title-md text-on-surface">{spaceName}</h1>
				<Button
					variant="pill-base"
					size="pill"
					aria-label="Favorite space"
					onClick={onToggleFavorite}
				>
					<Star size={16} />
				</Button>
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="pill-base"
					size="pill"
					aria-label="Sign in"
					onClick={() => openLogin(null, 'login')}
				>
					Sign in
				</Button>
				<Button variant="pill-base" size="pill" aria-label="Switch space" onClick={onSwitchSpace}>
					<ArrowLeftRight size={16} />
				</Button>
			</div>
		</div>
	)
}
