'use client'

import { getAppType } from '@/apps/_registry'
import CanvasCard from '@/core/entity/CanvasCard'
import FolderStack from '@/core/entity/FolderStack'
import Window from '@/core/entity/Window'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'
import { resolveEntityView } from './resolveEntityView'

interface EntityShellProps {
	entity: Entity
	isFocused: boolean
	interactive?: boolean
}

export default function EntityShell({
	entity,
	isFocused,
	interactive = true,
}: EntityShellProps) {
	const upsert = useEntityStore((s) => s.upsert)
	const { shell } = resolveEntityView(entity)

	if (shell === 'window') {
		const app = getAppType(entity.type)
		const Actions = app?.windowActions
		return (
			<Window
				entity={entity}
				isFocused={isFocused}
				headerActions={Actions ? <Actions entityId={entity.id} /> : undefined}
			/>
		)
	}

	if (shell === 'card') {
		return (
			<CanvasCard entity={entity} isFocused={isFocused} interactive={interactive} />
		)
	}

	return (
		<div className="flex items-center justify-center w-full h-full">
			<FolderStack
				entityId={entity.id}
				entityIds={(entity.state?.child_ids as string[]) ?? [entity.id]}
				label={entity.summary || entity.type}
				onClick={() => useSheetStore.getState().open(entity.id, 'entity')}
				onRename={(newLabel) => {
					const current = useEntityStore.getState().entities[entity.id]
					if (current) {
						upsert({
							...current,
							summary: newLabel,
							updated_at: new Date().toISOString(),
						})
					}
				}}
			/>
		</div>
	)
}
