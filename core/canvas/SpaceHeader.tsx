'use client'

import { ArrowLeftRight, Star } from 'lucide-react'

interface PillButtonProps {
	icon: React.ReactNode
	label: string
	onClick?: () => void
}

function PillButton({ icon, label, onClick }: PillButtonProps) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className="flex items-center justify-center h-8 px-3 py-1 cursor-pointer transition-colors hover:bg-white/80 active:scale-95"
			style={{
				backgroundColor: 'rgba(255, 255, 255, 0.64)',
				border: '0.5px solid rgba(255, 255, 255, 1)',
				borderRadius: '20px 20px 20px 4px',
			}}
		>
			{icon}
		</button>
	)
}

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
				<PillButton icon={<Star size={16} />} label="Favorite space" onClick={onToggleFavorite} />
			</div>
			<div>
				<PillButton
					icon={<ArrowLeftRight size={16} />}
					label="Switch space"
					onClick={onSwitchSpace}
				/>
			</div>
		</div>
	)
}
