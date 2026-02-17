import type React from 'react'
import WindowControl from '@/core/entity/WindowControl'

interface WindowHeaderProps {
	isFocused: boolean
	onClose: () => void
	dragBind: () => Record<string, unknown>
	children?: React.ReactNode
}

export default function WindowHeader({
	isFocused,
	onClose,
	dragBind,
	children,
}: WindowHeaderProps) {
	const opacity = isFocused ? 'opacity-100' : 'opacity-70'

	return (
		<>
			{/* Close control — positioned outside drag zone to avoid
			    @use-gesture's onClickCapture from filterTaps blocking clicks */}
			<div className={`absolute z-20 ${opacity}`} style={{ top: 4, left: 16 }}>
				<WindowControl onClick={onClose} />
			</div>

			{/* Title bar — transparent drag zone */}
			<div
				{...dragBind()}
				data-window-header=""
				className={`absolute top-0 left-0 right-0 z-10 h-10 cursor-grab active:cursor-grabbing ${opacity}`}
				style={{
					touchAction: 'none',
				}}
			/>

			{/* Header actions — positioned outside drag zone to avoid
			    @use-gesture's onClickCapture from filterTaps blocking clicks */}
			{children && (
				<div
					data-window-actions=""
					className={`absolute top-0 right-0 z-20 flex items-center gap-2 h-10 px-2 py-2 ${opacity}`}
				>
					{children}
				</div>
			)}
		</>
	)
}
