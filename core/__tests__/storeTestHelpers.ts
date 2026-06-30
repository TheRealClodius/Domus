import { useAgentUiStore } from '@/core/stores/agentUiStore'
import { useEntityStore } from '@/core/stores/entityStore'
import { useSpatialStore } from '@/core/stores/spatialStore'
import type { Entity } from '@/lib/types'

export function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'window',
		position: { x: 0, y: 0, locked: false },
		size: { width: 400, height: 300 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

export function resetAllStores(): void {
	useEntityStore.setState({
		entities: {},
		focusedId: null,
		_hydrating: false,
		_fromCDC: false,
	})
	useSpatialStore.setState({ selectedIds: new Set<string>() })
	useAgentUiStore.setState({
		agentActiveIds: new Set<string>(),
		_pendingMap: {},
	})
}
