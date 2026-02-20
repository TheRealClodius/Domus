'use client'

import LoginSheetContent from '@/core/auth/LoginSheetContent'
import ProfilePanel, { type ProfileSection } from '@/core/profile/ProfilePanel'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import SheetEntityContent from '@/core/sheet/SheetEntityContent'

const VALID_SECTIONS = new Set<string>(['general', 'connections', 'billing', 'usage'])

/** Client wrapper — keeps the render function off the server/client boundary */
export default function SpaceSheet() {
	return (
		<FullScreenSheet>
			{({ entityId, contentType, sectionId }) => {
				if (contentType === 'entity' && entityId) {
					return <SheetEntityContent entityId={entityId} />
				}
				if (contentType === 'login') {
					return <LoginSheetContent />
				}
				if (contentType === 'profile' && sectionId && VALID_SECTIONS.has(sectionId)) {
					return <ProfilePanel sectionId={sectionId as ProfileSection} />
				}
				return <p className="text-on-surface-muted">No content</p>
			}}
		</FullScreenSheet>
	)
}
