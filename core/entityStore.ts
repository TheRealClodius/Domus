import { create } from 'zustand'
import type { Entity } from '@/lib/types'

interface EntityState {
	entities: Record<string, Entity>
	focusedId: string | null
	_hydrating: boolean
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
}

export const useEntityStore = create<EntityState>((set, get) => ({
	entities: {},
	focusedId: null,
	_hydrating: false,

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

		const maxZ = Math.max(...Object.values(entities).map((e) => e.z_index))
		if (entity.z_index >= maxZ) return

		set((state) => ({
			entities: {
				...state.entities,
				[id]: { ...state.entities[id], z_index: maxZ + 1 },
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
		set({ entities: map, _hydrating: false })
	},

	loadMockData: () => {
		set({ entities: {} })
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
}))
