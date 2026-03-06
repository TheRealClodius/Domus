import { describe, expect, it } from 'vitest'
import { noteApp } from '@/apps/notes'

describe('noteApp', () => {
	it('has correct type and presentation', () => {
		expect(noteApp.type).toBe('note')
		expect(noteApp.source).toBe('built-in')
		expect(noteApp.defaultPresentation).toBe('card')
		expect(noteApp.defaultSize).toEqual({ width: 232, height: 300 })
	})

	it('reduce is a passthrough', () => {
		const state = { foo: 'bar' }
		expect(noteApp.reduce(state, 'anything', {})).toBe(state)
	})

	it('summarize always returns empty string', () => {
		expect(noteApp.summarize({})).toBe('')
		expect(noteApp.summarize({ foo: 'bar' })).toBe('')
	})

	it('summarizeOn is empty — never auto-summarizes', () => {
		expect(noteApp.summarizeOn).toEqual([])
	})
})
