import { create } from 'zustand'
import {
	ANCHOR_OFFSET_X,
	ANCHOR_OFFSET_Y,
	CARD_HEIGHT,
	CARD_WIDTH,
	FOLDER_SIZE,
} from '@/core/spatial/folderConstants'
import { coercePresentation } from '@/lib/presentationRules'
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
	scatterFolder: (folderId: string, viewport?: { width: number; height: number }) => void
	gatherEntities: (entityIds: string[], targetPosition?: { x: number; y: number }) => void
	ejectFromFolder: (
		folderId: string,
		childId: string,
		viewport?: { width: number; height: number },
	) => void
	selectedIds: Set<string>
	toggleSelected: (id: string) => void
	clearSelection: () => void
	agentActiveIds: Set<string>
	setAgentActive: (id: string) => void
	clearAgentActive: (id: string) => void
	clearAllAgentActive: () => void
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
		for (const e of entities) {
			const correctedPresentation = coercePresentation(e.type, e.presentation)
			map[e.id] =
				correctedPresentation !== e.presentation ? { ...e, presentation: correctedPresentation } : e
		}
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
		return Object.values(get().entities).filter(
			(e) =>
				e.presentation !== 'hidden' &&
				!e.archived &&
				!(e.state?._folderId && !e.state?._scatterOrigin),
		)
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

	scatterFolder: (folderId, viewport) => {
		const folder = get().entities[folderId]
		if (!folder || folder.presentation !== 'folder') return

		const childIds = (folder.state?.child_ids ?? []) as string[]
		if (childIds.length === 0) {
			set((state) => ({
				entities: {
					...state.entities,
					[folderId]: {
						...state.entities[folderId],
						archived: true,
						updated_at: new Date().toISOString(),
					},
				},
			}))
			return
		}

		const vw = viewport?.width ?? 1280
		const vh = viewport?.height ?? 800
		const cx = vw / 2 - CARD_WIDTH / 2
		const cy = vh / 2 - CARD_HEIGHT / 2
		const SPREAD = 120
		const origin = { x: folder.position.x, y: folder.position.y }

		// Phase 1 (T=0): 'spraying'. Show children at FINAL scatter positions.
		// _scatterOrigin makes Framer Motion's `initial` start at folder position,
		// so both scale (GATHER_SCALE→1) and position (origin→scatter) animate
		// simultaneously from the same spring on mount.
		// Pre-compute z_indexes so children already have their final order
		// before the animation starts (prevents visual reorder on cleanup)
		const maxZ = Math.max(...Object.values(get().entities).map((e) => e.z_index), 0)

		set((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			for (let i = 0; i < childIds.length; i++) {
				const child = updated[childIds[i]]
				if (!child) continue

				// Single child: place at viewport center (no radial offset)
				// Multiple children: radial spread around center
				let sx: number
				let sy: number
				if (childIds.length === 1) {
					sx = cx
					sy = cy
				} else {
					const angle = (i / childIds.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
					const dist = SPREAD * (0.5 + Math.random() * 0.5)
					sx = Math.round(cx + Math.cos(angle) * dist)
					sy = Math.round(cy + Math.sin(angle) * dist)
				}
				updated[childIds[i]] = {
					...child,
					presentation: 'card',
					position: {
						x: sx,
						y: sy,
						locked: true,
					},
					z_index: maxZ + 1 + i,
					state: { ...child.state, _scatterOrigin: origin, _folderId: folderId },
					updated_at: now,
				}
			}

			updated[folderId] = {
				...updated[folderId],
				state: {
					...updated[folderId].state,
					_scatterPhase: 'spraying',
					_gatherPhase: undefined,
				},
				updated_at: now,
			}
			return { entities: updated }
		})

		// Phase 2 (T=500ms): Cards have settled. Hide folder (AnimatePresence
		// handles fade-out exit), clean up children's transient state.
		setTimeout(() => {
			set((state) => {
				const updated = { ...state.entities }
				const now = new Date().toISOString()

				const f = updated[folderId]
				if (f) {
					updated[folderId] = {
						...f,
						archived: true,
						state: { ...f.state, _scatterPhase: undefined },
						updated_at: now,
					}
				}

				// Clear transient state from children — fully detach from folder
				for (const id of childIds) {
					const child = updated[id]
					if (!child) continue
					const { _scatterOrigin, _folderId: _, ...rest } = child.state
					updated[id] = { ...child, state: rest }
				}

				return { entities: updated }
			})
		}, 500)
	},

	gatherEntities: (entityIds, targetPosition) => {
		if (entityIds.length < 2) return

		const entities = entityIds.map((id) => get().entities[id]).filter(Boolean)
		if (entities.length < 2) return

		const cx = targetPosition
			? Math.round(targetPosition.x)
			: Math.round(
					entities.reduce((sum, e) => sum + e.position.x + e.size.width / 2, 0) / entities.length,
				)
		const cy = targetPosition
			? Math.round(targetPosition.y)
			: Math.round(
					entities.reduce((sum, e) => sum + e.position.y + e.size.height / 2, 0) / entities.length,
				)

		// Determine folder ID upfront (reuse or new)
		const current = get().entities
		const sharedFolderId = entityIds.reduce<string | null>(
			(acc, id) => {
				const fid = current[id]?.state?._folderId as string | undefined
				if (!fid) return null
				if (acc === null) return fid
				return acc === fid ? acc : null
			},
			null as string | null,
		)
		const folderId = sharedFolderId ?? crypto.randomUUID()

		// Phase 0+1: Create/reuse folder with _gatherPhase: 'approaching' + move children to target
		set((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			// Move all children to target — offset so their bottom-center anchor
			// aligns with the folder's bottom-center anchor
			for (const id of entityIds) {
				const entity = updated[id]
				if (!entity) continue
				updated[id] = {
					...entity,
					position: { x: cx - ANCHOR_OFFSET_X, y: cy - ANCHOR_OFFSET_Y, locked: true },
				}
			}

			// Create or reuse folder immediately (with _gatherPhase)
			if (sharedFolderId && updated[sharedFolderId]) {
				updated[sharedFolderId] = {
					...updated[sharedFolderId],
					presentation: 'folder',
					position: { x: cx, y: cy, locked: true },
					state: {
						...updated[sharedFolderId].state,
						child_ids: entityIds,
						_gatherPhase: 'approaching',
						_scatterPhase: undefined,
					},
					updated_at: now,
				}
			} else {
				const maxZ = Math.max(...Object.values(updated).map((e) => e.z_index), 0)
				updated[folderId] = {
					id: folderId,
					space_id: entities[0].space_id,
					user_id: entities[0].user_id,
					type: 'folder',
					presentation: 'folder',
					position: { x: cx, y: cy, locked: true },
					size: { width: FOLDER_SIZE, height: FOLDER_SIZE },
					z_index: maxZ + 1,
					content: '',
					state: { child_ids: entityIds, _gatherPhase: 'approaching' },
					summary: 'New folder',
					created_by: 'user',
					archived: false,
					created_at: now,
					updated_at: now,
				}
			}

			return { entities: updated }
		})

		// Phase 2 (T=300ms): Switch to 'closing' — folder cards fan → idle
		setTimeout(() => {
			set((state) => {
				const folder = state.entities[folderId]
				if (!folder) return state
				return {
					entities: {
						...state.entities,
						[folderId]: {
							...folder,
							state: { ...folder.state, _gatherPhase: 'closing' },
							updated_at: new Date().toISOString(),
						},
					},
				}
			})
		}, 300)

		// Phase 3 (T=600ms): Mark children as folder members, clear gather phase.
		// presentation stays 'card' — visibility is controlled by _folderId alone.
		setTimeout(() => {
			set((state) => {
				const updated = { ...state.entities }
				const now = new Date().toISOString()

				for (const id of entityIds) {
					const entity = updated[id]
					if (!entity) continue
					updated[id] = {
						...entity,
						state: { ...entity.state, _folderId: folderId },
						updated_at: now,
					}
				}

				const folder = updated[folderId]
				if (folder) {
					updated[folderId] = {
						...folder,
						state: { ...folder.state, _gatherPhase: undefined },
						updated_at: now,
					}
				}

				return { entities: updated }
			})
		}, 600)
	},

	ejectFromFolder: (folderId, childId, viewport) => {
		const folder = get().entities[folderId]
		if (!folder || folder.presentation !== 'folder') return

		const childIds = (folder.state?.child_ids ?? []) as string[]
		if (!childIds.includes(childId)) return

		const vw = viewport?.width ?? 1280
		const vh = viewport?.height ?? 800
		const origin = { x: folder.position.x, y: folder.position.y }
		const remaining = childIds.filter((id) => id !== childId)

		set((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			// Eject child: card presentation, place at viewport center
			const child = updated[childId]
			if (child) {
				updated[childId] = {
					...child,
					presentation: 'card',
					position: {
						x: vw / 2 - CARD_WIDTH / 2,
						y: vh / 2 - CARD_HEIGHT / 2,
						locked: true,
					},
					state: { ...child.state, _scatterOrigin: origin, _folderId: undefined },
					updated_at: now,
				}
			}

			// Update or archive folder
			if (remaining.length === 0) {
				updated[folderId] = {
					...updated[folderId],
					archived: true,
					state: { ...updated[folderId].state, child_ids: remaining },
					updated_at: now,
				}
			} else {
				updated[folderId] = {
					...updated[folderId],
					state: { ...updated[folderId].state, child_ids: remaining },
					summary: `${remaining.length} items`,
					updated_at: now,
				}
			}

			return { entities: updated }
		})
	},

	selectedIds: new Set<string>(),

	toggleSelected: (id) => {
		set((state) => {
			const next = new Set(state.selectedIds)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return { selectedIds: next }
		})
	},

	clearSelection: () => {
		set({ selectedIds: new Set<string>() })
	},

	agentActiveIds: new Set<string>(),

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
}))
