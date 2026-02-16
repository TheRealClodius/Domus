import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppDock from '@/core/canvas/AppDock'

describe('AppDock', () => {
	afterEach(() => cleanup())

	it('has data-testid app-dock', () => {
		render(<AppDock items={[]} />)
		expect(screen.getByTestId('app-dock')).toBeDefined()
	})

	it('renders app icon buttons for each item', () => {
		const items = [
			{ icon: <span>N</span>, label: 'Notes', onClick: vi.fn() },
			{ icon: <span>C</span>, label: 'Chat', onClick: vi.fn() },
		]
		render(<AppDock items={items} />)
		expect(screen.getByRole('button', { name: 'Notes' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Chat' })).toBeDefined()
	})

	it('calls onClick when an item is clicked', () => {
		const onClick = vi.fn()
		const items = [{ icon: <span>N</span>, label: 'Notes', onClick }]
		render(<AppDock items={items} />)
		fireEvent.click(screen.getByRole('button', { name: 'Notes' }))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('dock is 48px wide', () => {
		render(<AppDock items={[]} />)
		const dock = screen.getByTestId('app-dock') as HTMLElement
		expect(dock.style.width).toBe('48px')
	})
})
