'use client'

import LoginSheetContent from '@/core/auth/LoginSheetContent'
import SettingsSheet from '@/core/profile/SettingsSheet'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import SheetEntityContent from '@/core/sheet/SheetEntityContent'
import { useSheetStore } from '@/core/sheetStore'

/** Client wrapper — keeps the render function off the server/client boundary */
export default function SpaceSheet() {
	const contentType = useSheetStore((s) => s.contentType)

	return (
		<FullScreenSheet layout={contentType === 'profile' ? 'wide' : 'default'}>
			{({ entityId, contentType: ct, sectionId }) => {
				if (ct === 'entity' && entityId) {
					return <SheetEntityContent entityId={entityId} />
				}
				if (ct === 'login') {
					return <LoginSheetContent />
				}
				if (ct === 'profile') {
					return <SettingsSheet initialSection={sectionId} />
				}
				return <p className="text-on-surface-muted">No content</p>
			}}
		</FullScreenSheet>
	)
}
