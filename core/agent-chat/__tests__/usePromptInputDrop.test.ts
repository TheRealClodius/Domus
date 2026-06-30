import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePromptInputDrop } from '@/core/chat/usePromptInputDrop'

function makeDropEvent(files: File[], type = 'drop'): DragEvent {
	const dt = {
		types: files.length > 0 ? ['Files'] : [],
		files,
		items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
	}
	return {
		type,
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		dataTransfer: dt,
	} as unknown as DragEvent
}

describe('usePromptInputDrop', () => {
	it('isDragOver is false initially', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)

		expect(result.current.isDragOver).toBe(false)
	})

	it('isDragOver becomes true on dragenter with files', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)

		const enterEvent = makeDropEvent([new File(['x'], 'a.png')], 'dragenter')
		act(() => {
			result.current.dropHandlers.onDragEnter(enterEvent)
		})

		expect(result.current.isDragOver).toBe(true)
	})

	it('isDragOver becomes false on dragleave', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)

		const enterEvent = makeDropEvent([new File(['x'], 'a.png')], 'dragenter')
		act(() => {
			result.current.dropHandlers.onDragEnter(enterEvent)
		})
		act(() => {
			result.current.dropHandlers.onDragLeave(makeDropEvent([], 'dragleave'))
		})

		expect(result.current.isDragOver).toBe(false)
	})

	it('drop with valid files calls onFilesAccepted', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)
		const file = new File(['hello'], 'photo.png', { type: 'image/png' })

		act(() => {
			result.current.dropHandlers.onDrop(makeDropEvent([file]))
		})

		expect(onFiles).toHaveBeenCalledWith([file])
	})

	it('drop respects remaining capacity (maxItems - currentCount)', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 9 }),
		)
		const files = [
			new File(['a'], 'a.png', { type: 'image/png' }),
			new File(['b'], 'b.png', { type: 'image/png' }),
		]

		act(() => {
			result.current.dropHandlers.onDrop(makeDropEvent(files))
		})

		expect(onFiles).toHaveBeenCalledWith([files[0]])
	})

	it('drop rejects files over 5MB', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)
		// 6MB file
		const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })

		act(() => {
			result.current.dropHandlers.onDrop(makeDropEvent([bigFile]))
		})

		expect(onFiles).toHaveBeenCalledWith([])
	})

	it('drop resets isDragOver to false', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)

		const enterEvt = makeDropEvent([new File(['x'], 'a.png')], 'dragenter')
		act(() => {
			result.current.dropHandlers.onDragEnter(enterEvt)
		})
		expect(result.current.isDragOver).toBe(true)

		act(() => {
			result.current.dropHandlers.onDrop(makeDropEvent([new File(['x'], 'a.png')]))
		})
		expect(result.current.isDragOver).toBe(false)
	})

	it('ignores drag events without files', () => {
		const onFiles = vi.fn()
		const { result } = renderHook(() =>
			usePromptInputDrop({ onFilesAccepted: onFiles, maxItems: 10, currentCount: 0 }),
		)

		act(() => {
			result.current.dropHandlers.onDragEnter(makeDropEvent([], 'dragenter'))
		})

		expect(result.current.isDragOver).toBe(false)
	})
})
