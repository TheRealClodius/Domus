import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActionChip from '@/core/chat/ActionChip'

describe('ActionChip', () => {
	afterEach(cleanup)

	it('shows spinner and tool label when pending', () => {
		render(<ActionChip tool="create_entity" status="pending" />)
		expect(screen.getByText(/creating entity/i)).toBeDefined()
		expect(screen.getByTestId('action-chip-spinner')).toBeDefined()
	})

	it('shows checkmark and result label when done', () => {
		render(
			<ActionChip
				tool="create_entity"
				status="done"
				result={{ id: 'e-1', summary: 'Grocery list' }}
			/>,
		)
		expect(screen.getByText(/created "Grocery list"/i)).toBeDefined()
		expect(screen.getByTestId('action-chip-check')).toBeDefined()
	})

	it('calls onFocusEntity when clicked and done', () => {
		const onFocus = vi.fn()
		render(
			<ActionChip
				tool="create_entity"
				status="done"
				result={{ id: 'e-1', summary: 'Note' }}
				onFocusEntity={onFocus}
			/>,
		)
		fireEvent.click(screen.getByRole('button'))
		expect(onFocus).toHaveBeenCalledWith('e-1')
	})

	it('is not clickable when pending', () => {
		render(<ActionChip tool="create_entity" status="pending" />)
		expect(screen.queryByRole('button')).toBeNull()
	})
})
