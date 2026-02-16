import { create } from 'zustand'
import type { Entity } from '@/lib/types'

interface EntityState {
	entities: Record<string, Entity>
	focusedId: string | null
	upsert: (entity: Entity) => void
	remove: (id: string) => void
	bumpZIndex: (id: string) => void
	setFocused: (id: string | null) => void
	updatePosition: (id: string, pos: { x: number; y: number }) => void
	updateSize: (id: string, size: { width: number; height: number }) => void
	updateContent: (id: string, content: string) => void
	loadMockData: () => void
	getEntity: (id: string) => Entity | undefined
	getEntitiesSorted: () => Entity[]
	getVisibleEntities: () => Entity[]
}

export const useEntityStore = create<EntityState>((set, get) => ({
	entities: {},
	focusedId: null,

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
		return Object.values(get().entities).filter((e) => e.presentation !== 'hidden')
	},
}))
