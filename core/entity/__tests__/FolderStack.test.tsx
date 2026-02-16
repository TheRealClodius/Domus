import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FolderStack from '@/core/entity/FolderStack'

describe('FolderStack', () => {
	afterEach(() => cleanup())

	it('has data-testid folder-stack', () => {
		render(<FolderStack entityIds={['a', 'b']} />)
		expect(screen.getByTestId('folder-stack')).toBeDefined()
	})

	it('renders up to 3 stacked thumbnails', () => {
		const { container } = render(<FolderStack entityIds={['a', 'b', 'c', 'd']} />)
		const cards = container.querySelectorAll('.rounded-lg')
		expect(cards.length).toBe(3)
	})

	it('renders correct count for fewer than 3 entities', () => {
		const { container } = render(<FolderStack entityIds={['a']} />)
		const cards = container.querySelectorAll('.rounded-lg')
		expect(cards.length).toBe(1)
	})

	it('renders label when provided', () => {
		render(<FolderStack entityIds={['a']} label="Notes" />)
		expect(screen.getByText('Notes')).toBeDefined()
	})

	it('calls onClick when clicked', () => {
		const onClick = vi.fn()
		render(<FolderStack entityIds={['a']} onClick={onClick} />)
		fireEvent.click(screen.getByTestId('folder-stack'))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('includes item count in aria-label', () => {
		render(<FolderStack entityIds={['a', 'b', 'c']} label="Notes" />)
		expect(screen.getByRole('button', { name: 'Notes (3 items)' })).toBeDefined()
	})
})
