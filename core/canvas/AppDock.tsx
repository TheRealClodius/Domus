'use client'

interface AppDockItem {
	icon: React.ReactNode
	label: string
	onClick: () => void
}

interface AppDockProps {
	items: AppDockItem[]
}

export default function AppDock({ items }: AppDockProps) {
	return (
		<div
			data-testid="app-dock"
			className="flex flex-col items-center gap-2.5 rounded-lg bg-surface-raised p-1"
			style={{
				width: 48,
				border: '0.5px solid rgba(79, 90, 98, 0.25)',
			}}
		>
			{items.map((item) => (
				<button
					key={item.label}
					type="button"
					aria-label={item.label}
					onClick={item.onClick}
					className="flex h-10 w-10 items-center justify-center rounded-md text-on-surface-muted transition-colors hover:bg-surface-sunken hover:text-on-surface active:scale-95"
				>
					{item.icon}
				</button>
			))}
		</div>
	)
}
