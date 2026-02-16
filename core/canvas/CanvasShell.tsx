'use client'

import type React from 'react'
import { useSheetStore } from '@/core/sheetStore'
import { DURATION } from '@/lib/motion'

const INSET_REST = 12
const INSET_SHEET = 20

export default function CanvasShell({ children }: { children: React.ReactNode }) {
	const isSheetOpen = useSheetStore((s) => s.isOpen)

	return (
		<div
			data-testid="canvas-shell"
			className="absolute rounded-lg bg-surface-sunken overflow-hidden"
			style={{
				inset: isSheetOpen ? INSET_SHEET : INSET_REST,
				transition: `inset ${DURATION.medium}s ease-out`,
				transitionDelay: isSheetOpen ? `${DURATION.fast}s` : '0s',
				...(isSheetOpen ? { pointerEvents: 'none' as const } : {}),
			}}
		>
			{children}
		</div>
	)
}
