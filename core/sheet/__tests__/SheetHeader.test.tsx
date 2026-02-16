import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetHeader from '@/core/sheet/SheetHeader'

describe('SheetHeader', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders close button', () => {
		render(<SheetHeader onClose={() => {}} />)
		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
	})

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn()
		render(<SheetHeader onClose={onClose} />)
		await userEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('renders actions slot when provided', () => {
		render(
			<SheetHeader onClose={() => {}}>
				<button type="button">Custom Action</button>
			</SheetHeader>,
		)
		expect(screen.getByText('Custom Action')).toBeDefined()
	})

	it('renders without actions', () => {
		const { container } = render(<SheetHeader onClose={() => {}} />)
		expect(container.querySelector('[data-testid="sheet-header"]')).toBeDefined()
	})
})
