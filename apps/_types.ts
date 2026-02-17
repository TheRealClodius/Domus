import type { ComponentType } from 'react'
import type { EntitySize, Presentation } from '@/lib/types'

export type AppMode = 'window' | 'card' | 'sheet'

export interface AppProps<TState = Record<string, unknown>> {
	entityId: string
	state: TState
	dispatch: (action: string, params: unknown) => void
	mode?: AppMode
}

export interface BuiltInApp {
	source: 'built-in'
	type: string
	name: string
	icon: ComponentType<{ className?: string }>
	component: ComponentType<AppProps>
	windowActions?: ComponentType<{ entityId: string }>
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
