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
		const cards = container.querySelectorAll('.rounded-xl')
		expect(cards.length).toBe(3)
	})

	it('always renders exactly 3 thumbnail cards regardless of entity count', () => {
		const { container } = render(<FolderStack entityId="e-1" entityIds={['a']} />)
		const cards = container.querySelectorAll('.rounded-xl')
		expect(cards.length).toBe(3)
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

	it('renders label as frosted pill', () => {
		const { container } = render(
			<FolderStack entityId="e-1" entityIds={['a', 'b']} label="Photos" />,
		)
		const pill = container.querySelector('.rounded-full.backdrop-blur-\\[4px\\]')
		expect(pill).toBeDefined()
		expect(pill?.textContent).toBe('Photos')
	})

	it('double-clicking label makes it contentEditable', () => {
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" />)

		const pill = screen.getByTestId('folder-label')
		expect(pill.getAttribute('contenteditable')).not.toBe('true')

		fireEvent.doubleClick(pill)

		expect(screen.getByTestId('folder-label').getAttribute('contenteditable')).toBe('true')
	})

	it('pressing Enter commits rename', () => {
		const onRename = vi.fn()
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" onRename={onRename} />)

		const pill = screen.getByTestId('folder-label')
		fireEvent.doubleClick(pill)
		pill.textContent = 'Photos'
		fireEvent.keyDown(pill, { key: 'Enter' })

		expect(onRename).toHaveBeenCalledWith('Photos')
		expect(screen.getByTestId('folder-label').getAttribute('contenteditable')).not.toBe('true')
	})

	it('pressing Escape cancels rename without calling onRename', () => {
		const onRename = vi.fn()
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" onRename={onRename} />)

		const pill = screen.getByTestId('folder-label')
		fireEvent.doubleClick(pill)
		pill.textContent = 'Something else'
		fireEvent.keyDown(pill, { key: 'Escape' })

		expect(onRename).not.toHaveBeenCalled()
		expect(pill.textContent).toBe('Notes')
	})

	it('blur commits rename', () => {
		const onRename = vi.fn()
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" onRename={onRename} />)

		const pill = screen.getByTestId('folder-label')
		fireEvent.doubleClick(pill)
		pill.textContent = 'Renamed'
		fireEvent.blur(pill)

		expect(onRename).toHaveBeenCalledWith('Renamed')
	})

	it('does not call onRename when value is unchanged', () => {
		const onRename = vi.fn()
		render(<FolderStack entityId="e-1" entityIds={['a']} label="Notes" onRename={onRename} />)

		const pill = screen.getByTestId('folder-label')
		fireEvent.doubleClick(pill)
		fireEvent.keyDown(pill, { key: 'Enter' })

		expect(onRename).not.toHaveBeenCalled()
	})
})
