import { create } from 'zustand'
import { registerHydrateCallback } from '@/core/stores/hydrateCallbacks'
import { useEntityStore } from '@/core/stores/entityStore'
import type { Entity } from '@/lib/types'

interface AgentUiState {
	agentActiveIds: Set<string>
	_pendingMap: Record<string, string>
	setAgentActive: (id: string) => void
	clearAgentActive: (id: string) => void
	clearAllAgentActive: () => void
	addPending: (toolCallId: string, entity: Entity) => void
	removePending: (toolCallId: string) => void
	clearAllPending: () => void
}

export const useAgentUiStore = create<AgentUiState>((set, get) => ({
	agentActiveIds: new Set<string>(),
	_pendingMap: {},

	setAgentActive: (id) => {
		set((state) => {
			const next = new Set(state.agentActiveIds)
			next.add(id)
			return { agentActiveIds: next }
		})
	},

	clearAgentActive: (id) => {
		set((state) => {
			const next = new Set(state.agentActiveIds)
			next.delete(id)
			return { agentActiveIds: next }
		})
	},

	clearAllAgentActive: () => {
		set({ agentActiveIds: new Set<string>() })
	},

	addPending: (toolCallId, entity) => {
		const pendingId = `pending-${toolCallId}`
		const pendingEntity = { ...entity, id: pendingId }
		const entityStore = useEntityStore.getState()
		useEntityStore.setState({
			entities: { ...entityStore.entities, [pendingId]: pendingEntity },
		})
		set((state) => ({
			_pendingMap: { ...state._pendingMap, [toolCallId]: pendingId },
		}))
	},

	removePending: (toolCallId) => {
		const { _pendingMap } = get()
		const pendingId = _pendingMap[toolCallId]
		if (!pendingId) return
		const entityStore = useEntityStore.getState()
		const { [pendingId]: _, ...rest } = entityStore.entities
		useEntityStore.setState({ entities: rest })
		const { [toolCallId]: __, ...restMap } = _pendingMap
		set({ _pendingMap: restMap })
	},

	clearAllPending: () => {
		const { _pendingMap } = get()
		const pendingIds = new Set(Object.values(_pendingMap))
		if (pendingIds.size === 0) return
		const entityStore = useEntityStore.getState()
		const filtered: Record<string, Entity> = {}
		for (const [id, entity] of Object.entries(entityStore.entities)) {
			if (!pendingIds.has(id)) filtered[id] = entity
		}
		useEntityStore.setState({ entities: filtered })
		set({ _pendingMap: {} })
	},
}))

registerHydrateCallback(() => {
	useAgentUiStore.setState({ _pendingMap: {} })
})
