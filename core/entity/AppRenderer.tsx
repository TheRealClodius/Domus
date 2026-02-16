'use client'

import { Component, type ReactNode, useCallback } from 'react'
import { getAppType } from '@/apps/_registry'
import type { Entity } from '@/lib/types'

class ErrorBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode; fallback: ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback
		}
		return this.props.children
	}
}

function NoteRenderer({ entity }: { entity: Entity }) {
	return <div className="prose prose-sm">{entity.content}</div>
}

function FallbackRenderer({ entity }: { entity: Entity }) {
	return (
		<div className="p-2">
			<p className="text-sm font-medium text-on-surface">{entity.type}</p>
			<p className="text-sm text-on-surface-muted">{entity.summary}</p>
		</div>
	)
}

export default function AppRenderer({
	entity,
	mode,
}: {
	entity: Entity
	mode: 'window' | 'card' | 'sheet'
}) {
	// TODO: wire to reducer -> Supabase write path
	const dispatch = useCallback((_action: string, _params: unknown) => {}, [])

	const app = getAppType(entity.type)

	const content = app ? (
		<app.component entityId={entity.id} state={entity.state} dispatch={dispatch} mode={mode} />
	) : entity.type === 'note' ? (
		<NoteRenderer entity={entity} />
	) : (
		<FallbackRenderer entity={entity} />
	)

	return <ErrorBoundary fallback={<FallbackRenderer entity={entity} />}>{content}</ErrorBoundary>
}
