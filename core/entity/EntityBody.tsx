'use client'

import { useCallback, useRef } from 'react'
import { getAppType } from '@/apps/_registry'
import { IframeSandbox } from '@/core/entity/IframeSandbox'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'
import type { EntityViewMode } from './resolveEntityView'
import { resolveEntityView } from './resolveEntityView'

export function FallbackRenderer({ entity }: { entity: Entity }) {
	return (
		<div className="p-2">
			<p className="text-sm font-medium text-on-surface">{entity.type}</p>
			<p className="text-sm text-on-surface-muted">{entity.summary}</p>
		</div>
	)
}

function ImageRenderer({ entity }: { entity: Entity }) {
	const imageUrl = (entity.state?.image_url ?? entity.state?.src) as string | undefined
	const prompt = entity.state?.generation_prompt as string | undefined
	const error = entity.state?.generation_error as string | undefined

	if (error && !imageUrl) {
		return (
			<div className="flex items-center justify-center h-full text-on-surface-muted">
				<p>Image generation failed: {error}</p>
			</div>
		)
	}
	if (!imageUrl) return <FallbackRenderer entity={entity} />

	return (
		<div className="flex flex-col items-center gap-3 p-4">
			<img
				src={imageUrl}
				alt={prompt || entity.summary || 'Generated image'}
				className="max-w-full rounded-lg"
				data-testid="image-renderer"
			/>
			{prompt && <p className="text-body-sm text-on-surface-muted italic">"{prompt}"</p>}
		</div>
	)
}

export default function EntityBody({
	entity,
	mode,
}: {
	entity: Entity
	mode: EntityViewMode
}) {
	const updateState = useEntityStore((s) => s.updateState)
	const app = getAppType(entity.type)
	const summarizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const { body } = resolveEntityView(entity)

	const dispatch = useCallback(
		(action: string, params: unknown) => {
			if (!app) return
			const current = useEntityStore.getState().entities[entity.id]
			if (!current) return
			const newState = app.reduce(current.state, action, params)
			const newSummary = app.summarize(newState)
			updateState(entity.id, newState, newSummary)

			const { summarizeOn, summarizeDebounceMs = 0 } = app
			const shouldSummarize = summarizeOn === undefined || summarizeOn.includes(action)
			if (!shouldSummarize) return

			if (summarizeTimerRef.current !== null) {
				clearTimeout(summarizeTimerRef.current)
			}
			summarizeTimerRef.current = setTimeout(() => {
				summarizeTimerRef.current = null
				fetch(`/api/entities/${entity.id}/summarize`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						type: entity.type,
						state: newState,
						content: current.content,
					}),
				}).catch(() => {
					// fire-and-forget — errors are logged server-side
				})
			}, summarizeDebounceMs)
		},
		[entity.id, entity.type, app, updateState],
	)

	if (body === 'generated') {
		return <IframeSandbox entity={entity} />
	}

	if (body === 'image') {
		return <ImageRenderer entity={entity} />
	}

	if (body === 'builtin' && app) {
		return (
			<app.component entityId={entity.id} state={entity.state} dispatch={dispatch} mode={mode} />
		)
	}

	return <FallbackRenderer entity={entity} />
}
