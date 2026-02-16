import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SheetBody from '@/core/sheet/SheetBody'

describe('SheetBody', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders children', () => {
		render(
			<SheetBody>
				<p>Sheet content here</p>
			</SheetBody>,
		)
		expect(screen.getByText('Sheet content here')).toBeDefined()
	})

	it('has scroll-fade class for edge masking', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]')
		expect(body?.className).toContain('scroll-fade')
	})

	it('has overflow-auto for scrolling', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]')
		expect(body?.className).toContain('overflow-auto')
	})
})
