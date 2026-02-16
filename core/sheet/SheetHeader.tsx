'use client'

import type React from 'react'
import WindowControl from '@/core/entity/WindowControl'

interface SheetHeaderProps {
	onClose: () => void
	children?: React.ReactNode
}

export default function SheetHeader({ onClose, children }: SheetHeaderProps) {
	return (
		<div
			data-testid="sheet-header"
			className="flex items-center justify-between h-12 px-5 border-b border-outline bg-surface-raised"
		>
			<WindowControl onClick={onClose} />
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	)
}
