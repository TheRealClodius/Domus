import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatContextBridge } from '@/core/agent-chat/chatContextBridge'
import CanvasCard from '@/core/entity/CanvasCard'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

vi.mock('@/core/entity/AppRenderer', () => ({
	default: ({ entity, mode }: { entity: Entity; mode: string }) => (
		<div data-testid="mock-app-renderer" data-mode={mode} data-type={entity.type} />
	),
}))

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

describe('CanvasCard', () => {
	const mockSetFocused = vi.fn()
	const mockArchive = vi.fn()

	beforeEach(() => {
		mockSetFocused.mockClear()
		mockArchive.mockClear()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			setFocused: mockSetFocused,
			archive: mockArchive,
		})
	})

	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('renders entity summary text', () => {
		const entity = makeEntity({ type: 'plain_text', summary: 'Quick project notes' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByText('Quick project notes')).toBeDefined()
	})

	it('renders entity type in metadata', () => {
		const entity = makeEntity({ type: 'note', summary: 'A note card' })
		render(<CanvasCard entity={entity} />)
		const metadata = screen.getByTestId('card-metadata')
		expect(metadata.textContent).toContain('note')
	})

	it('has data-testid canvas-card', () => {
		const entity = makeEntity()
		render(<CanvasCard entity={entity} />)
		expect(screen.getByTestId('canvas-card')).toBeDefined()
	})

	it('renders at fixed 232×300 dimensions regardless of entity.size', () => {
		const entity = makeEntity({ size: { width: 500, height: 400 } })
		const { container } = render(<CanvasCard entity={entity} />)
		const card = container.firstElementChild as HTMLElement
		expect(card.style.width).toBe('232px')
		expect(card.style.height).toBe('300px')
	})

	it('shows relative timestamp in metadata', () => {
		const recent = new Date(Date.now() - 30_000).toISOString()
		const entity = makeEntity({ updated_at: recent })
		render(<CanvasCard entity={entity} />)
		// Should render some relative time text (e.g. "just now", "30s ago")
		const metadata = screen.getByTestId('card-metadata')
		expect(metadata.textContent).toBeTruthy()
	})

	it('agent-created card has data-agent-glow attribute', () => {
		const now = new Date().toISOString()
		const entity = makeEntity({ created_by: 'agent', updated_at: now })
		const { container } = render(<CanvasCard entity={entity} />)
		const glowElement = container.querySelector('[data-agent-glow]')
		expect(glowElement).not.toBeNull()
	})

	it('renders add-to-chat, expand, and delete buttons', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByRole('button', { name: 'Add to chat' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Expand' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined()
	})

	it('renders add-to-chat leftmost, then expand and delete on right', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const buttons = screen.getAllByRole('button')
		const chatIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Add to chat')
		const expandIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Expand')
		const deleteIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Delete')
		expect(chatIdx).toBeLessThan(expandIdx)
		expect(expandIdx).toBeLessThan(deleteIdx)
	})

	it('renders grab handle at bottom of card', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByTestId('grab-handle')).toBeDefined()
	})

	it('action buttons container is hidden by default (opacity-0)', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const actions = screen.getByTestId('card-actions')
		expect(actions.className).toContain('opacity-0')
	})

	it('click on card calls setFocused with entity id', () => {
		const entity = makeEntity({ id: 'card-99' })
		const { container } = render(<CanvasCard entity={entity} />)

		const rootElement = container.firstElementChild
		expect(rootElement).not.toBeNull()
		if (rootElement) {
			fireEvent.mouseDown(rootElement)
		}

		expect(mockSetFocused).toHaveBeenCalledWith('card-99')
	})

	it('delete button archives entity', () => {
		const entity = makeEntity({ id: 'card-del', summary: 'To delete' })
		render(<CanvasCard entity={entity} />)
		const btn = screen.getByRole('button', { name: 'Delete' })
		fireEvent.click(btn)
		expect(mockArchive).toHaveBeenCalledWith('card-del')
	})

	it('add-to-chat button calls addEntityToChat', () => {
		const mockAddEntityToChat = vi.fn()
		useChatContextBridge.setState({ addEntityToChat: mockAddEntityToChat })
		const entity = makeEntity({ id: 'card-chat', summary: 'Chat me' })
		render(<CanvasCard entity={entity} />)
		const btn = screen.getByRole('button', { name: 'Add to chat' })
		fireEvent.click(btn)
		expect(mockAddEntityToChat).toHaveBeenCalledWith(entity)
	})

	it('expand button opens sheet with entity id', () => {
		const entity = makeEntity({ id: 'card-1', summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const btn = screen.getByRole('button', { name: 'Expand' })
		fireEvent.click(btn)
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBe('card-1')
		expect(state.contentType).toBe('entity')
	})

	describe('pending entity', () => {
		it('renders warm shimmer for pending entity', () => {
			const entity = makeEntity({
				type: 'image',
				state: { _pending: true },
				created_by: 'agent',
				updated_at: new Date().toISOString(),
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('warm-shimmer')).toBeDefined()
			expect(screen.getByText('Generating...')).toBeDefined()
		})

		it('pending entity has agent glow', () => {
			const entity = makeEntity({
				type: 'image',
				state: { _pending: true },
				created_by: 'agent',
				updated_at: new Date().toISOString(),
			})
			const { container } = render(<CanvasCard entity={entity} />)
			expect(container.querySelector('[data-agent-glow]')).not.toBeNull()
		})

		it('pending entity does not render image', () => {
			const entity = makeEntity({
				type: 'image',
				state: { _pending: true },
				created_by: 'agent',
				updated_at: new Date().toISOString(),
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.queryByTestId('card-image')).toBeNull()
		})
	})

	describe('image cross-fade', () => {
		it('image starts with opacity-0 before load', () => {
			const entity = makeEntity({
				type: 'image',
				state: { image_url: 'https://example.com/test.png' },
			})
			render(<CanvasCard entity={entity} />)
			const img = screen.getByTestId('card-image') as HTMLImageElement
			expect(img.className).toContain('opacity-0')
		})

		it('image transitions to opacity-100 after load', () => {
			const entity = makeEntity({
				type: 'image',
				state: { image_url: 'https://example.com/test.png' },
			})
			render(<CanvasCard entity={entity} />)
			const img = screen.getByTestId('card-image') as HTMLImageElement
			fireEvent.load(img)
			expect(img.className).toContain('opacity-100')
		})
	})

	describe('image entity', () => {
		it('renders image when entity has state.image_url', () => {
			const entity = makeEntity({
				type: 'image',
				state: { image_url: 'https://example.com/sunset.png' },
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('card-image')).toBeDefined()
			const img = screen.getByTestId('card-image') as HTMLImageElement
			expect(img.src).toBe('https://example.com/sunset.png')
		})

		it('image card uses generation_prompt as alt text', () => {
			const entity = makeEntity({
				type: 'image',
				state: {
					image_url: 'https://example.com/sunset.png',
					generation_prompt: 'A beautiful sunset over the ocean',
				},
			})
			render(<CanvasCard entity={entity} />)
			const img = screen.getByTestId('card-image') as HTMLImageElement
			expect(img.alt).toBe('A beautiful sunset over the ocean')
		})

		it('image card still shows metadata row', () => {
			const entity = makeEntity({
				type: 'image',
				state: { image_url: 'https://example.com/sunset.png' },
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('card-metadata')).toBeDefined()
		})

		it('renders image when entity has state.src as fallback', () => {
			const entity = makeEntity({
				type: 'image',
				state: { src: 'https://example.com/fallback.png' },
			})
			render(<CanvasCard entity={entity} />)
			const img = screen.getByTestId('card-image') as HTMLImageElement
			expect(img.src).toBe('https://example.com/fallback.png')
		})

		it('prefers state.image_url over state.src', () => {
			const entity = makeEntity({
				type: 'image',
				state: {
					image_url: 'https://example.com/primary.png',
					src: 'https://example.com/fallback.png',
				},
			})
			render(<CanvasCard entity={entity} />)
			const img = screen.getByTestId('card-image') as HTMLImageElement
			expect(img.src).toBe('https://example.com/primary.png')
		})

		it('non-image entity still renders summary text', () => {
			const entity = makeEntity({ type: 'plain_text', summary: 'My note summary' })
			render(<CanvasCard entity={entity} />)
			expect(screen.getByText('My note summary')).toBeDefined()
			expect(screen.queryByTestId('card-image')).toBeNull()
		})
	})

	describe('focused elevation', () => {
		it('applies shadow-focused when isFocused is true', () => {
			const entity = makeEntity()
			render(<CanvasCard entity={entity} isFocused />)
			const card = screen.getByTestId('canvas-card')
			expect(card.className).toContain('shadow-focused')
		})

		it('applies shadow-resting when not focused', () => {
			const entity = makeEntity()
			render(<CanvasCard entity={entity} isFocused={false} />)
			const card = screen.getByTestId('canvas-card')
			expect(card.className).toContain('shadow-resting')
		})

		it('shadow-resting is default when isFocused is omitted', () => {
			const entity = makeEntity()
			render(<CanvasCard entity={entity} />)
			const card = screen.getByTestId('canvas-card')
			expect(card.className).toContain('shadow-resting')
		})
	})

	describe('app entity rendering', () => {
		it('renders AppRenderer for registered app types', () => {
			const entity = makeEntity({ type: 'sounds' })
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('app-renderer-card')).toBeDefined()
			const mock = screen.getByTestId('mock-app-renderer')
			expect(mock.getAttribute('data-mode')).toBe('card')
			expect(mock.getAttribute('data-type')).toBe('sounds')
		})

		it('still renders generic fallback for non-app entities', () => {
			// 'plain_text' is not in the app registry — should render summary text, not AppRenderer
			const entity = makeEntity({ type: 'plain_text', summary: 'A plain note' })
			render(<CanvasCard entity={entity} />)
			expect(screen.getByText('A plain note')).toBeDefined()
			expect(screen.queryByTestId('app-renderer-card')).toBeNull()
		})

		it('still renders image for image entities', () => {
			const entity = makeEntity({
				type: 'image',
				state: { image_url: 'https://example.com/img.png' },
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('card-image')).toBeDefined()
			expect(screen.queryByTestId('app-renderer-card')).toBeNull()
		})

		it('still renders shimmer for pending entities', () => {
			const entity = makeEntity({
				type: 'sounds',
				state: { _pending: true },
				created_by: 'agent',
				updated_at: new Date().toISOString(),
			})
			render(<CanvasCard entity={entity} />)
			expect(screen.getByTestId('warm-shimmer')).toBeDefined()
			expect(screen.queryByTestId('app-renderer-card')).toBeNull()
		})
	})
})
