import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetBackdrop from '@/core/sheet/SheetBackdrop'

describe('SheetBackdrop', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders backdrop overlay', () => {
		render(<SheetBackdrop onClose={() => {}} />)
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()
	})

	it('calls onClose on click', async () => {
		const onClose = vi.fn()
		render(<SheetBackdrop onClose={onClose} />)
		await userEvent.click(screen.getByTestId('sheet-backdrop'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('has fixed positioning to cover viewport', () => {
		render(<SheetBackdrop onClose={() => {}} />)
		const backdrop = screen.getByTestId('sheet-backdrop')
		expect(backdrop.className).toContain('fixed')
		expect(backdrop.className).toContain('inset-0')
	})
})
