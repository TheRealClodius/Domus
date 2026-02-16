// core/__tests__/sheetStore.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import { useSheetStore } from '@/core/sheetStore'

describe('sheetStore', () => {
	afterEach(() => {
		useSheetStore.getState().close()
	})

	it('starts closed', () => {
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(false)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBeNull()
	})

	it('open() sets isOpen, entityId, and contentType', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBe('entity-1')
		expect(state.contentType).toBe('entity')
	})

	it('open() with null entityId works for login', () => {
		useSheetStore.getState().open(null, 'login')
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBe('login')
	})

	it('close() resets to initial state', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().close()
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(false)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBeNull()
	})

	it('open() replaces existing sheet', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().open('entity-2', 'image')
		const state = useSheetStore.getState()
		expect(state.entityId).toBe('entity-2')
		expect(state.contentType).toBe('image')
	})
})
