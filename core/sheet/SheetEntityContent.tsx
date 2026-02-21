'use client'

import dynamic from 'next/dynamic'
import AppRenderer from '@/core/entity/AppRenderer'
import { useEntityStore } from '@/core/entityStore'
import SheetFolderContent from '@/core/sheet/SheetFolderContent'

const RichEditor = dynamic(() => import('@/core/editor/RichEditor'))

export default function SheetEntityContent({ entityId }: { entityId: string }) {
	const entity = useEntityStore((s) => s.entities[entityId])
	if (!entity) return <p className="text-on-surface-muted">Entity not found</p>

	if (entity.presentation === 'folder') {
		return <SheetFolderContent entityId={entityId} />
	}

	// Notes use the rich editor in sheet mode
	if (entity.type === 'note') {
		return <RichEditor entity={entity} />
	}

	return <AppRenderer entity={entity} mode="sheet" />
}
