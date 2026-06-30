import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePromptInputState } from '@/core/agent-chat/usePromptInputState'

describe('usePromptInputState', () => {
	it('initialises with IDLE layout, empty text, no context items', () => {
		const { result } = renderHook(() => usePromptInputState())

		expect(result.current.layout).toBe('IDLE')
		expect(result.current.text).toBe('')
		expect(result.current.contextItems).toEqual([])
		expect(result.current.menuOpen).toBe(false)
		expect(result.current.isComposing).toBe(false)
	})

	it('setText updates text', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => result.current.setText('hello'))

		expect(result.current.text).toBe('hello')
	})

	it('setLayout transitions between states', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => result.current.setLayout('CLICKED'))
		expect(result.current.layout).toBe('CLICKED')

		act(() => result.current.setLayout('BIG'))
		expect(result.current.layout).toBe('BIG')
	})

	it('addContextItem appends an item', () => {
		const { result } = renderHook(() => usePromptInputState())
		const item = {
			id: 'test-1',
			file: new File([''], 'photo.png', { type: 'image/png' }),
			name: 'photo.png',
			type: 'image' as const,
			status: 'ready' as const,
		}

		act(() => result.current.addContextItem(item))

		expect(result.current.contextItems).toHaveLength(1)
		expect(result.current.contextItems[0].id).toBe('test-1')
	})

	it('enforces max 10 context items', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => {
			for (let i = 0; i < 12; i++) {
				result.current.addContextItem({
					id: `item-${i}`,
					file: new File([''], `file-${i}.png`, { type: 'image/png' }),
					name: `file-${i}.png`,
					type: 'image',
					status: 'ready',
				})
			}
		})

		expect(result.current.contextItems).toHaveLength(10)
	})

	it('removeContextItem removes by id', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => {
			result.current.addContextItem({
				id: 'keep',
				file: new File([''], 'a.png', { type: 'image/png' }),
				name: 'a.png',
				type: 'image',
				status: 'ready',
			})
			result.current.addContextItem({
				id: 'remove',
				file: new File([''], 'b.png', { type: 'image/png' }),
				name: 'b.png',
				type: 'image',
				status: 'ready',
			})
		})

		act(() => result.current.removeContextItem('remove'))

		expect(result.current.contextItems).toHaveLength(1)
		expect(result.current.contextItems[0].id).toBe('keep')
	})

	it('updateContextItem patches a specific item', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => {
			result.current.addContextItem({
				id: 'item-1',
				file: new File([''], 'photo.png', { type: 'image/png' }),
				name: 'photo.png',
				type: 'image',
				status: 'loading',
			})
		})

		act(() =>
			result.current.updateContextItem('item-1', {
				status: 'ready',
				preview: 'data:image/png;base64,abc',
			}),
		)

		expect(result.current.contextItems[0].status).toBe('ready')
		expect(result.current.contextItems[0].preview).toBe('data:image/png;base64,abc')
	})

	it('canSend is true when text is non-empty', () => {
		const { result } = renderHook(() => usePromptInputState())

		expect(result.current.canSend).toBe(false)

		act(() => result.current.setText('hi'))

		expect(result.current.canSend).toBe(true)
	})

	it('canSend is true when context items exist (even with empty text)', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => {
			result.current.addContextItem({
				id: 'item-1',
				file: new File([''], 'photo.png', { type: 'image/png' }),
				name: 'photo.png',
				type: 'image',
				status: 'ready',
			})
		})

		expect(result.current.canSend).toBe(true)
	})

	it('canSend is false for whitespace-only text', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => result.current.setText('   \n  '))

		expect(result.current.canSend).toBe(false)
	})

	it('reset clears everything back to IDLE', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => {
			result.current.setText('hello')
			result.current.setLayout('BIG')
			result.current.addContextItem({
				id: 'item-1',
				file: new File([''], 'photo.png', { type: 'image/png' }),
				name: 'photo.png',
				type: 'image',
				status: 'ready',
			})
			result.current.setMenuOpen(true)
		})

		act(() => result.current.reset())

		expect(result.current.layout).toBe('IDLE')
		expect(result.current.text).toBe('')
		expect(result.current.contextItems).toEqual([])
		expect(result.current.menuOpen).toBe(false)
	})

	it('setMenuOpen toggles menu state', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => result.current.setMenuOpen(true))
		expect(result.current.menuOpen).toBe(true)

		act(() => result.current.setMenuOpen(false))
		expect(result.current.menuOpen).toBe(false)
	})

	it('setComposing tracks IME state', () => {
		const { result } = renderHook(() => usePromptInputState())

		act(() => result.current.setComposing(true))
		expect(result.current.isComposing).toBe(true)

		act(() => result.current.setComposing(false))
		expect(result.current.isComposing).toBe(false)
	})
})
