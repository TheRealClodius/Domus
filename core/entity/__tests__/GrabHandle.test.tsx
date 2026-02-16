import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import GrabHandle from '@/core/entity/GrabHandle'

describe('GrabHandle', () => {
	afterEach(() => cleanup())

	it('renders with data-testid grab-handle', () => {
		render(<GrabHandle />)
		expect(screen.getByTestId('grab-handle')).toBeDefined()
	})

	it('contains exactly 6 dot elements', () => {
		render(<GrabHandle />)
		const dots = screen.getAllByTestId('grab-handle-dot')
		expect(dots).toHaveLength(6)
	})

	it('has 40×32 container dimensions', () => {
		render(<GrabHandle />)
		const handle = screen.getByTestId('grab-handle')
		expect(handle.style.width).toBe('40px')
		expect(handle.style.height).toBe('32px')
	})
})
