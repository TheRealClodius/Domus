import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WindowControl from '@/core/entity/WindowControl'

describe('WindowControl', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders a button with Close window aria-label', () => {
		render(<WindowControl />)
		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
	})

	it('has red gradient background', () => {
		const { container } = render(<WindowControl />)
		const button = container.firstElementChild as HTMLElement
		expect(button.style.background).toContain('linear-gradient')
	})

	it('renders an inner dot element', () => {
		const { container } = render(<WindowControl />)
		const button = container.firstElementChild as HTMLElement
		const dot = button.querySelector('[data-dot]')
		expect(dot).not.toBeNull()
	})

	it('calls onClick when clicked', () => {
		const handleClick = vi.fn()
		render(<WindowControl onClick={handleClick} />)
		fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(handleClick).toHaveBeenCalledOnce()
	})

	it('stops propagation on mouseDown to prevent window drag', () => {
		const parentHandler = vi.fn()
		render(
			// biome-ignore lint/a11y/noStaticElementInteractions: test wrapper
			<div onMouseDown={parentHandler}>
				<WindowControl />
			</div>,
		)
		fireEvent.mouseDown(screen.getByRole('button', { name: 'Close window' }))
		expect(parentHandler).not.toHaveBeenCalled()
	})
})
