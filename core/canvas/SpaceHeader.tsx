'use client'

import { ArrowLeftRight, Star } from 'lucide-react'
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
	return (
		<div data-testid="space-header" className="flex w-full items-center justify-between py-4 px-4">
			<div className="flex items-center gap-2">
				<h1 className="font-display text-2xl text-on-surface">{spaceName}</h1>
				<Button
					variant="pill-base"
					size="pill"
					aria-label="Favorite space"
					onClick={onToggleFavorite}
				>
					<Star size={16} />
				</Button>
			</div>
			<div>
				<Button variant="pill-base" size="pill" aria-label="Switch space" onClick={onSwitchSpace}>
					<ArrowLeftRight size={16} />
				</Button>
			</div>
		</div>
	)
}
