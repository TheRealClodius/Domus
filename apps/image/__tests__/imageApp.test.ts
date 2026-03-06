import { describe, expect, it } from 'vitest'
import { imageApp } from '@/apps/image'

describe('imageApp', () => {
	it('has correct type and presentation', () => {
		expect(imageApp.type).toBe('image')
		expect(imageApp.source).toBe('built-in')
		expect(imageApp.defaultPresentation).toBe('card')
		expect(imageApp.defaultSize).toEqual({ width: 232, height: 300 })
	})

	it('reduce is a passthrough', () => {
		const state = { image_url: 'https://example.com/img.png' }
		expect(imageApp.reduce(state, 'anything', {})).toBe(state)
	})

	it('summarize returns generation_prompt when present', () => {
		expect(imageApp.summarize({ generation_prompt: 'a cat' })).toBe('a cat')
	})

	it('summarize returns empty string when generation_prompt is absent', () => {
		expect(imageApp.summarize({})).toBe('')
	})

	it('summarizeOn is empty — never auto-summarizes', () => {
		expect(imageApp.summarizeOn).toEqual([])
	})
})
