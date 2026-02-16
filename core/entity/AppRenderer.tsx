'use client'

import { Component, type ReactNode } from 'react'
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
	return (
		<ErrorBoundary fallback={<FallbackRenderer entity={entity} />}>
			{entity.type === 'note' ? (
				<NoteRenderer entity={entity} />
			) : (
				<FallbackRenderer entity={entity} />
			)}
		</ErrorBoundary>
	)
}
