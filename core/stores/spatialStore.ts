import { create } from 'zustand'
import { useEntityStore } from '@/core/stores/entityStore'
import {
	ANCHOR_OFFSET_X,
	ANCHOR_OFFSET_Y,
	CARD_HEIGHT,
	CARD_WIDTH,
	FOLDER_SIZE,
} from '@/core/spatial/folderConstants'
import type { Entity } from '@/lib/types'

interface SpatialState {
	selectedIds: Set<string>
	toggleSelected: (id: string) => void
	clearSelection: () => void
	scatterFolder: (folderId: string, viewport?: { width: number; height: number }) => void
	gatherEntities: (
		entityIds: string[],
		targetPosition?: { x: number; y: number },
		folderId?: string,
	) => void
	ejectFromFolder: (
		folderId: string,
		childId: string,
		viewport?: { width: number; height: number },
	) => void
}

export const useSpatialStore = create<SpatialState>(() => ({
	selectedIds: new Set<string>(),

	toggleSelected: (id) => {
		useSpatialStore.setState((state) => {
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
		useSpatialStore.setState({ selectedIds: new Set<string>() })
	},

	scatterFolder: (folderId, viewport) => {
		const { entities } = useEntityStore.getState()
		const folder = entities[folderId]
		if (!folder || folder.presentation !== 'folder') return

		const childIds = (folder.state?.child_ids ?? []) as string[]
		if (childIds.length === 0) {
			useEntityStore.setState((state) => ({
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

		const maxZ = Math.max(...Object.values(useEntityStore.getState().entities).map((e) => e.z_index), 0)

		useEntityStore.setState((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			for (let i = 0; i < childIds.length; i++) {
				const child = updated[childIds[i]]
				if (!child) continue

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

		setTimeout(() => {
			useEntityStore.setState((state) => {
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

	gatherEntities: (entityIds, targetPosition, explicitFolderId) => {
		if (!explicitFolderId && entityIds.length < 2) return
		if (entityIds.length < 1) return

		const entities = entityIds
			.map((id) => useEntityStore.getState().entities[id])
			.filter(Boolean)
		if (!explicitFolderId && entities.length < 2) return
		if (entities.length < 1) return

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

		let existingFolderId: string | null = null
		const currentEntities = useEntityStore.getState().entities
		if (explicitFolderId && currentEntities[explicitFolderId]) {
			existingFolderId = explicitFolderId
		} else if (!explicitFolderId) {
			existingFolderId = entityIds.reduce<string | null>(
				(acc, id) => {
					const fid = currentEntities[id]?.state?._folderId as string | undefined
					if (!fid) return null
					if (acc === null) return fid
					return acc === fid ? acc : null
				},
				null as string | null,
			)
		}
		const folderId = existingFolderId ?? explicitFolderId ?? crypto.randomUUID()
		const sharedFolderId = existingFolderId

		useEntityStore.setState((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

			for (const id of entityIds) {
				const entity = updated[id]
				if (!entity) continue
				updated[id] = {
					...entity,
					position: { x: cx - ANCHOR_OFFSET_X, y: cy - ANCHOR_OFFSET_Y, locked: true },
				}
			}

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

		setTimeout(() => {
			useEntityStore.setState((state) => {
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

		setTimeout(() => {
			useEntityStore.setState((state) => {
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
		const folder = useEntityStore.getState().entities[folderId]
		if (!folder || folder.presentation !== 'folder') return

		const childIds = (folder.state?.child_ids ?? []) as string[]
		if (!childIds.includes(childId)) return

		const vw = viewport?.width ?? 1280
		const vh = viewport?.height ?? 800
		const origin = { x: folder.position.x, y: folder.position.y }
		const remaining = childIds.filter((id) => id !== childId)

		useEntityStore.setState((state) => {
			const updated = { ...state.entities }
			const now = new Date().toISOString()

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
}))
