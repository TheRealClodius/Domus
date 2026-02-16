import type * as React from 'react'
import { cn } from '@/lib/utils'

function MenuCard({ children, className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="menu-card"
			data-testid="menu-card"
			className={cn(
				'flex flex-col gap-6 rounded-2xl border border-outline bg-surface p-2 shadow-overlay overflow-clip',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

function MenuCardItem({
	title,
	description,
	icon,
	className,
	...props
}: {
	title: string
	description: string
	icon?: React.ReactNode
} & Omit<React.ComponentProps<'button'>, 'children'>) {
	return (
		<button
			type="button"
			data-slot="menu-card-item"
			className={cn(
				'flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
				className,
			)}
			{...props}
		>
			{icon && (
				<div data-slot="menu-card-icon" className="shrink-0">
					{icon}
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1 py-2.5">
				<span className="font-display text-title-md text-on-surface">{title}</span>
				<span className="text-body text-on-surface-muted">{description}</span>
			</div>
		</button>
	)
}

export { MenuCard, MenuCardItem }
