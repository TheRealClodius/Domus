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

	it('has scroll-fade sized to sheet header height', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]') as HTMLElement
		expect(body.style.getPropertyValue('--scroll-fade-size')).toBe('3rem')
	})

	it('has top and bottom padding matching scroll-fade size', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]')
		expect(body?.className).toContain('pt-12')
		expect(body?.className).toContain('pb-12')
	})
})
