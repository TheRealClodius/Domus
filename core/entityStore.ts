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

	loadMockData: () => {
		const mockEntities: Entity[] = [
			{
				id: 'mock-note-window',
				space_id: 'mock-space',
				user_id: 'mock-user',
				type: 'note',
				presentation: 'window',
				position: { x: 40, y: 40, locked: false },
				size: { width: 500, height: 400 },
				z_index: 1,
				content: '# Welcome to Domus\n\nThis is a sample note rendered as a window.',
				state: {},
				summary: 'Welcome note',
				created_by: 'user',
				archived: false,
				created_at: '2026-02-15T10:00:00Z',
				updated_at: '2026-02-15T10:00:00Z',
			},
			{
				id: 'mock-note-card',
				space_id: 'mock-space',
				user_id: 'mock-user',
				type: 'note',
				presentation: 'card',
				position: { x: 600, y: 60, locked: false },
				size: { width: 280, height: 200 },
				z_index: 2,
				content: 'Quick thoughts about the project direction.',
				state: {},
				summary: 'Project thoughts',
				created_by: 'user',
				archived: false,
				created_at: '2026-02-15T11:00:00Z',
				updated_at: '2026-02-15T11:00:00Z',
			},
			{
				id: 'mock-agent-note',
				space_id: 'mock-space',
				user_id: 'mock-user',
				type: 'note',
				presentation: 'window',
				position: { x: 300, y: 320, locked: false },
				size: { width: 450, height: 350 },
				z_index: 3,
				content: '## Research Summary\n\nHere are the key findings from the analysis.',
				state: {},
				summary: 'Research summary',
				created_by: 'agent',
				archived: false,
				created_at: '2026-02-15T12:00:00Z',
				updated_at: '2026-02-15T12:00:00Z',
			},
			{
				id: 'mock-hidden',
				space_id: 'mock-space',
				user_id: 'mock-user',
				type: 'conversation_turn',
				presentation: 'hidden',
				position: { x: 0, y: 0, locked: false },
				size: { width: 0, height: 0 },
				z_index: 0,
				content: '',
				state: { role: 'user', content: 'hello' },
				summary: 'User greeting',
				created_by: 'user',
				archived: false,
				created_at: '2026-02-15T09:00:00Z',
				updated_at: '2026-02-15T09:00:00Z',
			},
		]

		const entities: Record<string, Entity> = {}
		for (const e of mockEntities) {
			if (e.presentation !== 'hidden') {
				entities[e.id] = e
			}
		}
		set({ entities })
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
