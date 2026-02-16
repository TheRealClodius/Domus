'use client'

import { X } from 'lucide-react'
import type React from 'react'
import { Button } from '@/core/ui/button'

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
			<Button variant="pill-base" size="pill" aria-label="Close sheet" onClick={onClose}>
				<X size={16} />
			</Button>
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	)
}
