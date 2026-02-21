'use client'

import { Button } from '@/core/ui/button'

export interface AppDockItem {
	id: string
	icon: React.ReactNode
	label: string
	onClick: () => void
}

interface AppDockProps {
	items: AppDockItem[]
	generatedItems?: AppDockItem[]
}

export default function AppDock({ items, generatedItems }: AppDockProps) {
	const hasGenerated = generatedItems && generatedItems.length > 0

	return (
		<div
			data-testid="app-dock"
			className="flex flex-col items-center gap-2 rounded-lg border-[0.5px] border-outline-variant/25 bg-surface-lowest p-1"
			style={{
				width: 48,
			}}
		>
			{items.map((item) => (
				<Button
					key={item.id}
					variant="ghost"
					size="icon-lg"
					aria-label={item.label}
					onClick={item.onClick}
					className="text-on-surface-muted hover:bg-surface hover:text-on-surface active:scale-95"
				>
					{item.icon}
				</Button>
			))}

			{hasGenerated && (
				<>
					<div className="w-6 border-t border-outline-variant/25" />
					{generatedItems.map((item) => (
						<Button
							key={item.id}
							variant="ghost"
							size="icon-lg"
							aria-label={item.label}
							onClick={item.onClick}
							className="text-on-surface-muted hover:bg-surface hover:text-on-surface active:scale-95"
						>
							{item.icon}
						</Button>
					))}
				</>
			)}
		</div>
	)
}
