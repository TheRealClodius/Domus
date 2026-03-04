import type { ComponentType } from 'react'
import type { EntitySize, Presentation } from '@/lib/types'

export type AppMode = 'window' | 'card' | 'sheet'

export interface AppProps<TState = Record<string, unknown>> {
	entityId: string
	state: TState
	dispatch: (action: string, params: unknown) => void
	mode?: AppMode
}

// SPIKE: entity-as-mcp — MCP tool schema for entity self-description
export interface ToolSchema {
	name: string
	description: string
	inputSchema: Record<string, unknown>
}

export interface BuiltInApp {
	source: 'built-in'
	type: string
	name: string
	description: string
	icon: ComponentType<{ className?: string }>
	component: ComponentType<AppProps>
	windowActions?: ComponentType<{ entityId: string }>
	defaultPresentation: Presentation
	defaultSize: EntitySize
	initialState?: Record<string, unknown>
	maxInstances?: number
	reduce: (
		state: Record<string, unknown>,
		action: string,
		params: unknown,
	) => Record<string, unknown>
	summarize: (state: Record<string, unknown>) => string
	/** Actions that trigger AI summary generation. `undefined` = all actions; `[]` = never. */
	summarizeOn?: string[]
	/** Debounce delay in ms before firing the AI summary request. Default 0 (immediate). */
	summarizeDebounceMs?: number
	// SPIKE: entity-as-mcp — optional self-describing tool schema
	getSchema?: (state: Record<string, unknown>) => ToolSchema[]
}
