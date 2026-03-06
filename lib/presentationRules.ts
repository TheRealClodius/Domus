import { getAppType } from '@/apps/_registry'
import type { Presentation } from '@/lib/types'

/**
 * Entity types that are never rendered directly on the canvas — includes both
 * agent-memory types and app-managed types like calendar_event that live
 * exclusively inside a window app.
 */
const HIDDEN_ONLY_TYPES = new Set([
	'conversation_turn',
	'fact',
	'personality_trait',
	'conversation_summary',
	'edge',
	'calendar_event', // managed by the calendar app, never a canvas card
])

export function getAllowedPresentations(type: string): Presentation[] {
	if (HIDDEN_ONLY_TYPES.has(type)) return ['hidden']
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
