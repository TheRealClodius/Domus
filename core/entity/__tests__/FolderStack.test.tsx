import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FolderStack from '@/core/entity/FolderStack'
import { useEntityStore } from '@/core/entityStore'

describe('FolderStack', () => {
	const mockSetFocused = vi.fn()

	beforeEach(() => {
		mockSetFocused.mockClear()
		useEntityStore.setState({ entities: {}, focusedId: null, setFocused: mockSetFocused })
	})

	afterEach(() => cleanup())

	it('has data-testid folder-stack', () => {
		render(<FolderStack entityId="e-1" entityIds={['a', 'b']} />)
		expect(screen.getByTestId('folder-stack')).toBeDefined()
	})

	it('renders up to 3 stacked thumbnails', () => {
		const { container } = render(<FolderStack entityId="e-1" entityIds={['a', 'b', 'c', 'd']} />)
		const cards = container.querySelectorAll('.rounded-lg')
		expect(cards.length).toBe(3)
	})

	it('renders correct count for fewer than 3 entities', () => {
		const { container } = render(<FolderStack entityId="e-1" entityIds={['a']} />)
		const cards = container.querySelectorAll('.rounded-lg')
		expect(cards.length).toBe(1)
	})

	it('renders label when provided', () => {
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" />)
		expect(screen.getByText('Notes')).toBeDefined()
	})

	it('calls onClick when clicked', () => {
		const onClick = vi.fn()
		render(<FolderStack entityId="e-1" entityIds={['a']} onClick={onClick} />)
		fireEvent.click(screen.getByTestId('folder-stack'))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('includes item count in aria-label', () => {
		render(<FolderStack entityId="e-1" entityIds={['a', 'b', 'c']} label="Notes" />)
		expect(screen.getByRole('button', { name: 'Notes (3 items)' })).toBeDefined()
	})

	it('mouseDown calls setFocused with entity id', () => {
		render(<FolderStack entityId="folder-1" entityIds={['a', 'b']} />)
		fireEvent.mouseDown(screen.getByTestId('folder-stack'))
		expect(mockSetFocused).toHaveBeenCalledWith('folder-1')
	})

	it('has pointer-events auto for click/drag interaction', () => {
		render(<FolderStack entityId="folder-1" entityIds={['a']} />)
		const stack = screen.getByTestId('folder-stack')
		expect(stack.style.pointerEvents).toBe('auto')
	})
})
