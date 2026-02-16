// Core types matching the Supabase schema.
// See docs/ARCHITECTURE.md for the full data model.

export type Presentation = 'window' | 'card' | 'folder' | 'sidebar' | 'hidden'

export type EntityCreator = 'user' | 'agent'

export interface EntityPosition {
	x: number
	y: number
	locked: boolean
}

export interface EntitySize {
	width: number
	height: number
}

export interface Entity {
	id: string
	space_id: string
	user_id: string
	type: string
	presentation: Presentation
	position: EntityPosition
	size: EntitySize
	z_index: number
	content: string
	state: Record<string, unknown>
	summary: string
	created_by: EntityCreator
	archived: boolean
	created_at: string
	updated_at: string
}

export interface Space {
	id: string
	name: string
	owner_id: string
	template_id: string | null
	created_at: string
	updated_at: string
}

export interface User {
	id: string
	email: string
	display_name: string | null
	avatar_url: string | null
	active_space_id: string | null
	created_at: string
	updated_at: string
}

export interface AppDefinition {
	type: string
	name: string
	defaultPresentation: Presentation
	defaultSize: EntitySize
}
