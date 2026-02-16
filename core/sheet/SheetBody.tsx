'use client'

import type React from 'react'

export default function SheetBody({ children }: { children: React.ReactNode }) {
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
