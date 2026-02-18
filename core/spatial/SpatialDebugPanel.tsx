'use client'

/**
 * SPIKE CODE — throwaway debug panel for testing spatial recipes.
 */

import { type RefObject, useCallback, useRef, useState } from 'react'
import { useEntityStore } from '@/core/entityStore'
import { entityToRect } from '@/core/spatial/primitives'
import type { Rect, Viewport } from '@/core/spatial/primitives'
import { tileNewEntities } from '@/core/spatial/tileNewEntities'
import { partForChat, unpartForChat } from '@/core/spatial/partForChat'

const CARD_SIZE = { width: 232, height: 300 }

interface Props {
	canvasRef: RefObject<HTMLDivElement | null>
	spaceId: string
	userId?: string
}

function getChatRect(canvasEl: HTMLElement | null): Rect | null {
	const chatEl = document.querySelector('[class*="z-50"][class*="fixed"]') as HTMLElement | null
	if (!chatEl) return null
	const chatBounds = chatEl.getBoundingClientRect()
	const canvasBounds = canvasEl?.getBoundingClientRect() ?? { left: 0, top: 0 }
	return {
		x: chatBounds.left - canvasBounds.left,
		y: chatBounds.top - canvasBounds.top,
		width: chatBounds.width,
		height: chatBounds.height,
	}
}

export default function SpatialDebugPanel({ canvasRef, spaceId, userId }: Props) {
	const [chatParted, setChatParted] = useState(false)
	const [lastChatRect, setLastChatRect] = useState<Rect | null>(null)
	const savedPositionsRef = useRef<Map<string, { x: number; y: number }> | null>(null)
	const savedSizesRef = useRef<Map<string, { width: number; height: number }> | null>(null)

	const getViewport = useCallback((): Viewport => {
		return {
			width: canvasRef.current?.clientWidth ?? window.innerWidth,
			height: canvasRef.current?.clientHeight ?? window.innerHeight,
		}
	}, [canvasRef])

	const handleTile6 = useCallback(() => {
		const store = useEntityStore.getState()
		const viewport = getViewport()

		const existing: Rect[] = Object.values(store.entities)
			.filter((e) => e.presentation !== 'hidden' && !e.archived)
			.map(entityToRect)

		const newSizes = Array(6).fill(CARD_SIZE)
		const { positions } = tileNewEntities({ newSizes, existing, viewport })

		for (let i = 0; i < 6; i++) {
			const id = crypto.randomUUID()
			store.upsert({
				id,
				space_id: spaceId,
				user_id: userId ?? 'mock-user',
				type: 'note',
				summary: `Tiled card ${i + 1}`,
				state: {},
				position: { x: positions[i].x, y: positions[i].y, locked: true },
				size: CARD_SIZE,
				z_index: Object.keys(store.entities).length + i + 1,
				presentation: 'card',
				archived: false,
				created_at: new Date().toISOString(),
			})
		}
	}, [getViewport, spaceId, userId])

	const handleToggleChatPart = useCallback(() => {
		const store = useEntityStore.getState()
		const viewport = getViewport()

		if (!chatParted) {
			const chatRect = getChatRect(canvasRef.current)
			if (!chatRect) {
				console.warn('[spatial] No chat element found in DOM')
				return
			}

			setLastChatRect(chatRect)
			console.log('[spatial] Chat rect:', chatRect)

			// Build entity map with resizable flag based on presentation
			const entityMap = new Map<string, Rect & { resizable: boolean }>()
			for (const e of Object.values(store.entities)) {
				if (e.presentation !== 'hidden' && !e.archived) {
					entityMap.set(e.id, {
						...entityToRect(e),
						resizable: e.presentation === 'window',
					})
				}
			}

			const result = partForChat({ entities: entityMap, chatRect, viewport })
			savedPositionsRef.current = result.savedPositions
			savedSizesRef.current = result.savedSizes

			console.log('[spatial] Moved', result.movedEntities.size, 'entities, resized', result.resizedEntities.size)

			for (const [id, pos] of result.movedEntities) {
				const orig = result.savedPositions.get(id)
				console.log('[spatial]  move', id.slice(0, 8), ':', orig?.x?.toFixed(0), ',', orig?.y?.toFixed(0), '->', pos.x.toFixed(0), ',', pos.y.toFixed(0))
				store.updatePosition(id, pos)
			}
			for (const [id, size] of result.resizedEntities) {
				const orig = result.savedSizes.get(id)
				console.log('[spatial]  resize', id.slice(0, 8), ':', orig?.width, 'x', orig?.height, '->', size.width, 'x', size.height)
				store.updateSize(id, size)
			}

			setChatParted(true)
		} else {
			// Restore positions
			if (savedPositionsRef.current) {
				const { positions, sizes } = unpartForChat(
					savedPositionsRef.current,
					savedSizesRef.current ?? new Map(),
				)
				for (const [id, pos] of positions) {
					store.updatePosition(id, pos)
				}
				for (const [id, size] of sizes) {
					store.updateSize(id, size)
				}
			}
			savedPositionsRef.current = null
			savedSizesRef.current = null
			setLastChatRect(null)
			setChatParted(false)
		}
	}, [chatParted, getViewport, canvasRef])

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 16,
				right: 16,
				zIndex: 9999,
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				pointerEvents: 'auto',
			}}
		>
			<button
				type="button"
				onClick={handleTile6}
				style={{
					padding: '8px 16px',
					background: '#6366f1',
					color: 'white',
					border: 'none',
					borderRadius: 8,
					cursor: 'pointer',
					fontSize: 13,
					fontWeight: 600,
				}}
			>
				Tile 6 cards
			</button>
			<button
				type="button"
				onClick={handleToggleChatPart}
				style={{
					padding: '8px 16px',
					background: chatParted ? '#ef4444' : '#10b981',
					color: 'white',
					border: 'none',
					borderRadius: 8,
					cursor: 'pointer',
					fontSize: 13,
					fontWeight: 600,
				}}
			>
				{chatParted ? 'Unpart (restore)' : 'Part for chat'}
			</button>
			{lastChatRect && (
				<div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace' }}>
					chat: {Math.round(lastChatRect.x)},{Math.round(lastChatRect.y)} {Math.round(lastChatRect.width)}x{Math.round(lastChatRect.height)}
				</div>
			)}
		</div>
	)
}
