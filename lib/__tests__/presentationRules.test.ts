import { describe, expect, test } from 'vitest'

import { coercePresentation, getAllowedPresentations } from '@/lib/presentationRules'

describe('getAllowedPresentations', () => {
	test('calendar_event returns ["hidden"]', () => {
		expect(getAllowedPresentations('calendar_event')).toEqual(['hidden'])
	})

	test('image returns ["card"]', () => {
		expect(getAllowedPresentations('image')).toEqual(['card'])
	})

	test('note returns ["card"]', () => {
		expect(getAllowedPresentations('note')).toEqual(['card'])
	})

	test.each([
		'conversation_turn',
		'fact',
		'personality_trait',
		'conversation_summary',
		'edge',
	])('memory type "%s" returns ["hidden"]', (type) => {
		expect(getAllowedPresentations(type)).toEqual(['hidden'])
	})

	test('calendar app type returns ["window", "hidden"]', () => {
		expect(getAllowedPresentations('calendar')).toEqual(['window', 'hidden'])
	})

	test('chat app type returns ["window", "hidden"]', () => {
		expect(getAllowedPresentations('chat')).toEqual(['window', 'hidden'])
	})
})

describe('coercePresentation', () => {
	test('calendar_event with "card" is coerced to "hidden"', () => {
		expect(coercePresentation('calendar_event', 'card')).toBe('hidden')
	})

	test('calendar_event with "hidden" stays "hidden"', () => {
		expect(coercePresentation('calendar_event', 'hidden')).toBe('hidden')
	})

	test('image with "card" stays "card"', () => {
		expect(coercePresentation('image', 'card')).toBe('card')
	})

	test('note with "card" stays "card"', () => {
		expect(coercePresentation('note', 'card')).toBe('card')
	})
})
