import { getAppType } from '@/apps/_registry'
import type { Presentation } from '@/lib/types'

/**
 * Entity types that are purely agent memory — never rendered on the canvas.
 * They are always stored with presentation: 'hidden'.
 */
const MEMORY_TYPES = new Set([
	'conversation_turn',
	'fact',
	'personality_trait',
	'conversation_summary',
	'edge',
])

export function getAllowedPresentations(type: string): Presentation[] {
	if (MEMORY_TYPES.has(type)) return ['hidden']
	const app = getAppType(type)
	if (!app) return ['card']
	if (app.defaultPresentation === 'window') return ['window', 'hidden']
	if (app.defaultPresentation === 'folder') return ['folder']
	return ['card']
}

/** Returns the default (first allowed) presentation for a type */
export function getDefaultPresentation(type: string): Presentation {
	return getAllowedPresentations(type)[0]
}

/** Returns the input presentation if valid, otherwise the type's default */
export function coercePresentation(type: string, requested: string): Presentation {
	const allowed = getAllowedPresentations(type)
	return allowed.includes(requested as Presentation) ? (requested as Presentation) : allowed[0]
}
