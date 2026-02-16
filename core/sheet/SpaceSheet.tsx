'use client'

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
				return <p className="text-on-surface-muted">No content</p>
			}}
		</FullScreenSheet>
	)
}
