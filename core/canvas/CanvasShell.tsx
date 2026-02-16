'use client'

import type React from 'react'
import { useSheetStore } from '@/core/sheetStore'
import { DURATION } from '@/lib/motion'

export default function CanvasShell({ children }: { children: React.ReactNode }) {
	const isSheetOpen = useSheetStore((s) => s.isOpen)

	return (
		<div
			data-testid="canvas-shell"
			className="absolute inset-3 rounded-lg bg-surface-sunken overflow-hidden"
			style={{
				transformOrigin: 'top center',
				transition: `transform ${DURATION.medium}s ease-out`,
				...(isSheetOpen ? { transform: 'scale(0.96)', pointerEvents: 'none' as const } : {}),
			}}
		>
			{children}
		</div>
	)
}
