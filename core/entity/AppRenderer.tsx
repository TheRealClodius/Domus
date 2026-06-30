'use client'

import { Component, type ReactNode } from 'react'
import EntityBody, { FallbackRenderer } from '@/core/entity/EntityBody'
import type { Entity } from '@/lib/types'
import type { EntityViewMode } from './resolveEntityView'

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

export default function AppRenderer({
	entity,
	mode,
}: {
	entity: Entity
	mode: EntityViewMode
}) {
	return (
		<ErrorBoundary fallback={<FallbackRenderer entity={entity} />}>
			<EntityBody entity={entity} mode={mode} />
		</ErrorBoundary>
	)
}
