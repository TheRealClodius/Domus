import { create } from 'zustand'
import type { Entity } from '@/lib/types'

interface EntityState {
	entities: Record<string, Entity>
	focusedId: string | null
	_hydrating: boolean
	_fromCDC: boolean
	_pendingMap: Record<string, string>
	upsert: (entity: Entity) => void
	remove: (id: string) => void
	archive: (id: string) => void
	bumpZIndex: (id: string) => void
	setFocused: (id: string | null) => void
	updatePosition: (id: string, pos: { x: number; y: number }) => void
	updateSize: (id: string, size: { width: number; height: number }) => void
	updatePresentation: (id: string, presentation: Entity['presentation']) => void
	updateContent: (id: string, content: string) => void
	updateState: (id: string, state: Record<string, unknown>, summary: string) => void
	hydrate: (entities: Entity[]) => void
	loadMockData: () => void
	getEntity: (id: string) => Entity | undefined
	getEntitiesSorted: () => Entity[]
	getVisibleEntities: () => Entity[]
	addPending: (toolCallId: string, entity: Entity) => void
	removePending: (toolCallId: string) => void
	clearAllPending: () => void
	scatterFolder: (folderId: string) => void
}

export const useEntityStore = create<EntityState>((set, get) => ({
	entities: {},
	focusedId: null,
	_hydrating: false,
	_fromCDC: false,
	_pendingMap: {},

	upsert: (entity) => {
		set((state) => ({
			entities: { ...state.entities, [entity.id]: entity },
		}))
	},

	remove: (id) => {
		set((state) => {
			const { [id]: _, ...rest } = state.entities
			return { entities: rest }
		})
	},

	archive: (id) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: {
					...state.entities[id],
					archived: true,
					updated_at: new Date().toISOString(),
				},
			},
		}))
	},

	bumpZIndex: (id) => {
		const { entities } = get()
		const entity = entities[id]
		if (!entity) return

		const others = Object.values(entities).filter((e) => e.id !== id)
		if (others.length === 0) return

		const maxOtherZ = Math.max(...others.map((e) => e.z_index))
		if (entity.z_index > maxOtherZ) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: { ...state.entities[id], z_index: maxOtherZ + 1 },
			},
		}))
	},

	setFocused: (id) => {
		if (id) {
			get().bumpZIndex(id)
		}
		set({ focusedId: id })
	},

	updatePosition: (id, pos) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: {
					...state.entities[id],
					position: { x: pos.x, y: pos.y, locked: true },
				},
			},
		}))
	},

	updateSize: (id, size) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: {
					...state.entities[id],
					size: {
						width: Math.max(size.width, 300),
						height: Math.max(size.height, 200),
					},
				},
			},
		}))
	},

	updatePresentation: (id, presentation) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: { ...state.entities[id], presentation },
			},
		}))
	},

	updateContent: (id, content) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: { ...state.entities[id], content, updated_at: new Date().toISOString() },
			},
		}))
	},

	updateState: (id, newState, summary) => {
		const entity = get().entities[id]
		if (!entity) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: {
					...state.entities[id],
					state: newState,
					summary,
					updated_at: new Date().toISOString(),
				},
			},
		}))
	},

	hydrate: (entities) => {
		set({ _hydrating: true })
		const map: Record<string, Entity> = {}
		for (const e of entities) map[e.id] = e
		set({ entities: map, _hydrating: false, _pendingMap: {} })
	},

	loadMockData: () => {
		set({ entities: {}, _pendingMap: {} })
	},

	getEntity: (id) => {
		return get().entities[id]
	},

	getEntitiesSorted: () => {
		return Object.values(get().entities).sort((a, b) => a.z_index - b.z_index)
	},

	getVisibleEntities: () => {
		return Object.values(get().entities).filter((e) => e.presentation !== 'hidden' && !e.archived)
	},

	addPending: (toolCallId, entity) => {
		const pendingId = `pending-${toolCallId}`
		const pendingEntity = { ...entity, id: pendingId }
		set((state) => ({
			entities: { ...state.entities, [pendingId]: pendingEntity },
			_pendingMap: { ...state._pendingMap, [toolCallId]: pendingId },
		}))
	},

	removePending: (toolCallId) => {
		const { _pendingMap } = get()
		const pendingId = _pendingMap[toolCallId]
		if (!pendingId) return
		set((state) => {
			const { [pendingId]: _, ...rest } = state.entities
			const { [toolCallId]: __, ...restMap } = state._pendingMap
			return { entities: rest, _pendingMap: restMap }
		})
	},

	clearAllPending: () => {
		const { _pendingMap, entities } = get()
		const pendingIds = new Set(Object.values(_pendingMap))
		if (pendingIds.size === 0) return
		const filtered: Record<string, Entity> = {}
		for (const [id, entity] of Object.entries(entities)) {
			if (!pendingIds.has(id)) filtered[id] = entity
		}
		set({ entities: filtered, _pendingMap: {} })
	},

	scatterFolder: (folderId) => {
		const folder = get().entities[folderId]
		if (!folder || folder.presentation !== 'folder') return

		const childIds = (folder.state?.child_ids ?? []) as string[]
		if (childIds.length === 0) {
			get().archive(folderId)
			return
		}

		const CARD_W = 232
		const CARD_H = 300
		const GAP = 24
		const COLS = Math.min(childIds.length, 3)
		const gridWidth = COLS * CARD_W + (COLS - 1) * GAP
		const startX = folder.position.x - gridWidth / 2 + CARD_W / 2
		const startY = folder.position.y

		set((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			for (let i = 0; i < childIds.length; i++) {
				const child = updated[childIds[i]]
				if (!child) continue

				const col = i % COLS
				const row = Math.floor(i / COLS)
				updated[childIds[i]] = {
					...child,
					presentation: 'card',
					position: {
						x: Math.round(startX + col * (CARD_W + GAP)),
						y: Math.round(startY + row * (CARD_H + GAP)),
						locked: true,
					},
					updated_at: now,
				}
			}

			updated[folderId] = { ...updated[folderId], archived: true, updated_at: now }
			return { entities: updated }
		})
	},
}))
