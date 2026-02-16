// core/editor/__tests__/RichEditor.test.tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RichEditor from '@/core/editor/RichEditor'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 0, y: 0, locked: false },
		size: { width: 280, height: 200 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

describe('RichEditor', () => {
	afterEach(() => {
		cleanup()
		useSheetStore.getState().close()
	})

	it('renders editor container', () => {
		const entity = makeEntity()
		render(<RichEditor entity={entity} />)
		expect(screen.getByTestId('rich-editor')).toBeDefined()
	})

	it('renders entity content as text', () => {
		const entity = makeEntity({ content: 'Hello world' })
		render(<RichEditor entity={entity} />)
		expect(screen.getByText('Hello world')).toBeDefined()
	})

	it('renders Tiptap JSON content', () => {
		const tiptapJson = JSON.stringify({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'From Tiptap JSON' }],
				},
			],
		})
		const entity = makeEntity({ content: tiptapJson })
		render(<RichEditor entity={entity} />)
		expect(screen.getByText('From Tiptap JSON')).toBeDefined()
	})

	it('renders tiptap editor element when content is empty', () => {
		const entity = makeEntity({ content: '' })
		render(<RichEditor entity={entity} />)
		const editor = screen.getByTestId('rich-editor')
		expect(editor.querySelector('.tiptap')).toBeDefined()
	})

	it('pauses streaming on editor focus when agent is streaming', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().startStreaming()

		const entity = makeEntity()
		render(<RichEditor entity={entity} />)

		// Wait for Tiptap to render (immediatelyRender: false means async)
		await waitFor(() => {
			const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap')
			expect(tiptap).not.toBeNull()
		})

		const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap') as HTMLElement
		tiptap.dispatchEvent(new FocusEvent('focus', { bubbles: true }))

		expect(useSheetStore.getState().streamPaused).toBe(true)
	})

	it('resumes streaming on editor blur when stream is paused', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().startStreaming()
		useSheetStore.getState().pauseStreaming()

		const entity = makeEntity()
		render(<RichEditor entity={entity} />)

		await waitFor(() => {
			const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap')
			expect(tiptap).not.toBeNull()
		})

		const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap') as HTMLElement
		tiptap.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

		expect(useSheetStore.getState().streamPaused).toBe(false)
	})

	it('does not pause streaming on focus when agent is not streaming', async () => {
		useSheetStore.getState().open('entity-1', 'entity')

		const entity = makeEntity()
		render(<RichEditor entity={entity} />)

		await waitFor(() => {
			const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap')
			expect(tiptap).not.toBeNull()
		})

		const tiptap = screen.getByTestId('rich-editor').querySelector('.tiptap') as HTMLElement
		tiptap.dispatchEvent(new FocusEvent('focus', { bubbles: true }))

		expect(useSheetStore.getState().streamPaused).toBe(false)
	})
})
