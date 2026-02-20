'use client'

/**
 * SPIKE CODE — throwaway debug panel for testing spatial recipes.
 */

import { type RefObject, useCallback } from 'react'
import { useEntityStore } from '@/core/entityStore'
import type { Rect, Viewport } from '@/core/spatial/primitives'
import { entityToRect } from '@/core/spatial/primitives'
import { tileNewEntities } from '@/core/spatial/tileNewEntities'

const CARD_SIZE = { width: 232, height: 300 }

interface Props {
	canvasRef: RefObject<HTMLDivElement | null>
	spaceId: string
	userId?: string
}

export default function SpatialDebugPanel({ canvasRef, spaceId, userId }: Props) {
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

	const btnStyle = {
		padding: '8px 16px',
		background: '#6366f1',
		color: 'white',
		border: 'none',
		borderRadius: 8,
		cursor: 'pointer',
		fontSize: 13,
		fontWeight: 600,
	} as const

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
			<button type="button" onClick={handleTile6} style={btnStyle}>
				Tile 6 cards
			</button>
		</div>
	)
}
