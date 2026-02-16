'use client'

import type React from 'react'

export default function SheetBody({ children }: { children: React.ReactNode }) {
	return (
		<div
			data-testid="sheet-body"
			className="h-full overflow-auto scroll-fade pt-12 pb-12"
			style={{ '--scroll-fade-size': '3rem' } as React.CSSProperties}
		>
			{children}
		</div>
	)
}
