import { getAppType } from '@/apps/_registry'
import type { Entity } from '@/lib/types'

export type EntityShellKind = 'window' | 'card' | 'folder'
export type EntityBodyKind = 'builtin' | 'generated' | 'image' | 'fallback'
export type EntityViewMode = 'window' | 'card' | 'sheet'

export interface EntityView {
	shell: EntityShellKind
	body: EntityBodyKind
	mode?: EntityViewMode
}

function hasImageUrl(entity: Entity): boolean {
	return !!(entity.state?.image_url ?? entity.state?.src)
}

export function resolveEntityView(entity: Entity): EntityView {
	const isGenerated = typeof entity.state?._code === 'string'

	let body: EntityBodyKind
	if (isGenerated) {
		body = 'generated'
	} else if (entity.type === 'image' && hasImageUrl(entity)) {
		body = 'image'
	} else if (getAppType(entity.type)) {
		body = 'builtin'
	} else {
		body = 'fallback'
	}

	let shell: EntityShellKind
	if (isGenerated) {
		shell = 'window'
	} else if (entity.presentation === 'folder') {
		shell = 'folder'
	} else if (entity.presentation === 'card') {
		shell = 'card'
	} else {
		shell = 'window'
	}

	const mode: EntityViewMode | undefined =
		shell === 'card' ? 'card' : shell === 'window' ? 'window' : undefined

	return { shell, body, mode }
}
