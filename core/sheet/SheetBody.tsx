'use client'

import type React from 'react'

interface SheetBodyProps {
	children: React.ReactNode
	layout?: 'default' | 'wide'
}

export default function SheetBody({ children, layout = 'default' }: SheetBodyProps) {
	if (layout === 'wide') {
		return (
			<div data-testid="sheet-body" className="h-full overflow-hidden flex flex-col pt-12">
				<div className="flex-1 min-h-0">{children}</div>
			</div>
		)
	}

	return (
		<div
			data-testid="sheet-body"
			className="h-full overflow-auto scroll-fade pt-12 pb-12 flex flex-col items-center"
			style={{ '--scroll-fade-size': '3rem' } as React.CSSProperties}
		>
			<div className="w-full max-w-2xl flex-1 text-left">{children}</div>
		</div>
	)
}
