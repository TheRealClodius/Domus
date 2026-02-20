import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatContextBridge } from '@/core/chat/chatContextBridge'
import type { ContextItem } from '@/core/chat/usePromptInputState'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'image',
		presentation: 'card',
		position: { x: 0, y: 0, locked: false },
		size: { width: 280, height: 200 },
		z_index: 1,
		content: '',
		state: { image_url: 'https://example.com/image.png' },
		summary: 'A test image',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

function mockFetchResponse(ok: boolean, blob?: Blob) {
	return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
		ok,
		status: ok ? 200 : 502,
		blob: () => Promise.resolve(blob ?? new Blob()),
	} as unknown as Response)
}

// Mock generateThumbnail
vi.mock('@/core/chat/imagePreview', () => ({
	generateThumbnail: vi.fn().mockResolvedValue('data:image/jpeg;base64,thumb'),
}))

describe('chatContextBridge', () => {
	let mockAdd: ReturnType<typeof vi.fn>
	let mockUpdate: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockAdd = vi.fn()
		mockUpdate = vi.fn()
		useChatContextBridge.setState({
			addContextItem: null,
			updateContextItem: null,
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('register stores callbacks', () => {
		useChatContextBridge.getState().register(mockAdd, mockUpdate)
		expect(useChatContextBridge.getState().addContextItem).toBe(mockAdd)
		expect(useChatContextBridge.getState().updateContextItem).toBe(mockUpdate)
	})

	it('addEntityToChat does nothing if not registered', async () => {
		const entity = makeEntity()
		await useChatContextBridge.getState().addEntityToChat(entity)
		expect(mockAdd).not.toHaveBeenCalled()
	})

	it('addEntityToChat skips non-image entities', async () => {
		useChatContextBridge.getState().register(mockAdd, mockUpdate)
		const entity = makeEntity({ type: 'note', state: {} })
		await useChatContextBridge.getState().addEntityToChat(entity)
		expect(mockAdd).not.toHaveBeenCalled()
	})

	it('addEntityToChat fetches image and adds context item', async () => {
		useChatContextBridge.getState().register(mockAdd, mockUpdate)
		const blob = new Blob(['fake-image'], { type: 'image/png' })
		mockFetchResponse(true, blob)

		const entity = makeEntity()
		await useChatContextBridge.getState().addEntityToChat(entity)

		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/proxy-image?url=https%3A%2F%2Fexample.com%2Fimage.png',
		)
		expect(mockAdd).toHaveBeenCalledOnce()
		const item: ContextItem = mockAdd.mock.calls[0][0]
		expect(item.type).toBe('image')
		expect(item.status).toBe('loading')
		expect(item.file).toBeInstanceOf(File)
		expect(item.file.type).toBe('image/png')

		expect(mockUpdate).toHaveBeenCalledWith(item.id, {
			status: 'ready',
			preview: 'data:image/jpeg;base64,thumb',
		})
	})

	it('addEntityToChat creates error item on fetch failure', async () => {
		useChatContextBridge.getState().register(mockAdd, mockUpdate)
		mockFetchResponse(false)

		const entity = makeEntity()
		await useChatContextBridge.getState().addEntityToChat(entity)

		expect(mockAdd).toHaveBeenCalledOnce()
		const item: ContextItem = mockAdd.mock.calls[0][0]
		expect(item.status).toBe('error')
		expect(item.error).toContain('502')
	})

	it('uses state.src as fallback when image_url is missing', async () => {
		useChatContextBridge.getState().register(mockAdd, mockUpdate)
		const blob = new Blob(['fake'], { type: 'image/jpeg' })
		mockFetchResponse(true, blob)

		const entity = makeEntity({ state: { src: 'https://example.com/fallback.jpg' } })
		await useChatContextBridge.getState().addEntityToChat(entity)

		expect(globalThis.fetch).toHaveBeenCalledWith(
			'/api/proxy-image?url=https%3A%2F%2Fexample.com%2Ffallback.jpg',
		)
		expect(mockAdd).toHaveBeenCalledOnce()
	})
})
