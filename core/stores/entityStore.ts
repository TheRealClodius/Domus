import { create } from 'zustand'
import { beginSkipAnimation, endSkipAnimation } from '@/core/canvas/animationState'
import { notifyHydrated } from '@/core/stores/hydrateCallbacks'
import { dbg } from '@/lib/debug'
import { coercePresentation } from '@/lib/presentationRules'
import type { Entity } from '@/lib/types'

interface EntityState {
	entities: Record<string, Entity>
	focusedId: string | null
	_hydrating: boolean
	_fromCDC: boolean
	upsert: (entity: Entity) => void
	remove: (id: string) => void
	archive: (id: string) => void
	bumpZIndex: (id: string) => void
	setFocused: (id: string | null) => void
	updatePosition: (id: string, pos: { x: number; y: number }, skipAnimation?: boolean) => void
	updateSize: (id: string, size: { width: number; height: number }, skipAnimation?: boolean) => void
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
	_fromCDC: false,

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

	updatePosition: (id, pos, skipAnimation) => {
		const entity = get().entities[id]
		if (!entity) return

		dbg('ui', 'move', { id, type: entity.type, x: Math.round(pos.x), y: Math.round(pos.y) })
		if (skipAnimation) beginSkipAnimation(id)
		set((state) => ({
			entities: {
				...state.entities,
				[id]: {
					...state.entities[id],
					position: { x: pos.x, y: pos.y, locked: true },
				},
			},
		}))
		if (skipAnimation) setTimeout(() => endSkipAnimation(id), 0)
	},

	updateSize: (id, size, skipAnimation) => {
		const entity = get().entities[id]
		if (!entity) return

		if (skipAnimation) beginSkipAnimation(id)
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
		if (skipAnimation) setTimeout(() => endSkipAnimation(id), 0)
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
		for (const e of entities) {
			const correctedPresentation = coercePresentation(e.type, e.presentation)
			map[e.id] =
				correctedPresentation !== e.presentation ? { ...e, presentation: correctedPresentation } : e
		}
		set({ entities: map, _hydrating: false })
		notifyHydrated()
	},

	loadMockData: () => {
		set({ entities: {} })
		notifyHydrated()
	},

	getEntity: (id) => {
		return get().entities[id]
	},

	getEntitiesSorted: () => {
		return Object.values(get().entities).sort((a, b) => a.z_index - b.z_index)
	},

	getVisibleEntities: () => {
		return Object.values(get().entities).filter(
			(e) =>
				e.presentation !== 'hidden' &&
				!e.archived &&
				!(e.state?._folderId && !e.state?._scatterOrigin),
		)
	},
}))
