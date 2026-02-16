'use client'

import LoginSheetContent from '@/core/auth/LoginSheetContent'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import SheetEntityContent from '@/core/sheet/SheetEntityContent'

/** Client wrapper — keeps the render function off the server/client boundary */
export default function SpaceSheet() {
	return (
		<FullScreenSheet>
			{({ entityId, contentType }) => {
				if (contentType === 'entity' && entityId) {
					return <SheetEntityContent entityId={entityId} />
				}
				if (contentType === 'login') {
					return <LoginSheetContent />
				}
				return <p className="text-on-surface-muted">No content</p>
			}}
		</FullScreenSheet>
	)
}
