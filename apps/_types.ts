import type { ComponentType } from 'react'
import type { EntitySize, Presentation } from '@/lib/types'

export interface AppProps<TState = Record<string, unknown>> {
	entityId: string
	state: TState
	dispatch: (action: string, params: unknown) => void
}

export interface BuiltInApp {
	source: 'built-in'
	type: string
	name: string
	icon: ComponentType<{ className?: string }>
	component: ComponentType<AppProps>
	defaultPresentation: Presentation
	defaultSize: EntitySize
	maxInstances?: number
	reduce: (
		state: Record<string, unknown>,
		action: string,
		params: unknown,
	) => Record<string, unknown>
	summarize: (state: Record<string, unknown>) => string
}
