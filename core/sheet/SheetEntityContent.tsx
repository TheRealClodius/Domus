'use client'

import AppRenderer from '@/core/entity/AppRenderer'
import { useEntityStore } from '@/core/entityStore'

export default function SheetEntityContent({ entityId }: { entityId: string }) {
	const entity = useEntityStore((s) => s.entities[entityId])
	if (!entity) return <p className="text-on-surface-muted">Entity not found</p>
	return <AppRenderer entity={entity} mode="sheet" />
}
