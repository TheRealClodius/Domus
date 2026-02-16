'use client'

import type React from 'react'

export default function SheetBody({ children }: { children: React.ReactNode }) {
	return (
		<div data-testid="sheet-body" className="flex-1 overflow-auto scroll-fade p-6">
			{children}
		</div>
	)
}
