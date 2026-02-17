import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WindowHeader from '@/core/entity/WindowHeader'

const noopBind = () => ({})

describe('WindowHeader', () => {
	afterEach(() => cleanup())

	it('renders close button with "Close window" label', () => {
		render(<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />)
		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
	})

	it('close click calls onClose', () => {
		const onClose = vi.fn()
		render(<WindowHeader isFocused={true} onClose={onClose} dragBind={noopBind} />)
		fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('renders drag zone with data-window-header, absolute, z-10', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />,
		)
		const header = container.querySelector('[data-window-header]') as HTMLElement
		expect(header).not.toBeNull()
		expect(header.className).toContain('absolute')
		expect(header.className).toContain('z-10')
	})

	it('does not render actions wrapper when no children', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />,
		)
		const actions = container.querySelector('[data-window-actions]')
		expect(actions).toBeNull()
	})

	it('renders children in actions slot when provided', () => {
		render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Options</button>
			</WindowHeader>,
		)
		expect(screen.getByRole('button', { name: 'Options' })).toBeDefined()
	})

	it('unfocused state reduces opacity on all elements', () => {
		const { container } = render(
			<WindowHeader isFocused={false} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Action</button>
			</WindowHeader>,
		)
		const closeWrapper = screen.getByRole('button', { name: 'Close window' }).parentElement!
		const dragZone = container.querySelector('[data-window-header]') as HTMLElement
		const actionsSlot = container.querySelector('[data-window-actions]') as HTMLElement

		expect(closeWrapper.className).toContain('opacity-70')
		expect(dragZone.className).toContain('opacity-70')
		expect(actionsSlot.className).toContain('opacity-70')
	})

	it('focused state has full opacity on all elements', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Action</button>
			</WindowHeader>,
		)
		const closeWrapper = screen.getByRole('button', { name: 'Close window' }).parentElement!
		const dragZone = container.querySelector('[data-window-header]') as HTMLElement
		const actionsSlot = container.querySelector('[data-window-actions]') as HTMLElement

		expect(closeWrapper.className).toContain('opacity-100')
		expect(dragZone.className).toContain('opacity-100')
		expect(actionsSlot.className).toContain('opacity-100')
	})
})
