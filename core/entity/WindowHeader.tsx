import type React from 'react'
import WindowControl from '@/core/entity/WindowControl'

interface WindowHeaderProps {
	isFocused: boolean
	onClose: () => void
	dragBind: () => Record<string, unknown>
	title?: string
	titleIcon?: React.ReactNode
	children?: React.ReactNode
}

export default function WindowHeader({
	isFocused,
	onClose,
	dragBind,
	title,
	titleIcon,
	children,
}: WindowHeaderProps) {
	const opacity = isFocused ? 'opacity-100' : 'opacity-85'

	return (
		<div
			data-window-frame=""
			className={`absolute top-0 left-0 right-0 z-10 h-12 flex items-center gap-4 pl-4 pr-2 py-2 ${opacity}`}
			style={{ pointerEvents: 'auto' }}
		>
			{/* Drag zone — absolute inset-0 z-0, behind close button and actions */}
			<div
				{...dragBind()}
				data-window-header=""
				className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
				style={{ touchAction: 'none' }}
			/>

			{/* Close control — inline in flow, above drag zone */}
			<div className="relative z-10 shrink-0">
				<WindowControl onClick={onClose} />
			</div>

			{/* Title + icon — shown for generated apps */}
			{title && (
				<div className="relative z-10 flex items-center gap-1.5 pointer-events-none select-none">
					{titleIcon}
					<span className="text-label-md text-on-surface-muted truncate">{title}</span>
				</div>
			)}

			{/* Actions — flex-1, pointer-events-none so drag zone shows through gaps */}
			{children && (
				<div
					data-window-actions=""
					className="relative z-10 flex flex-1 items-center self-stretch pointer-events-none"
				>
					{children}
				</div>
			)}
		</div>
	)
}
