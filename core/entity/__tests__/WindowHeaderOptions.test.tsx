import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WindowHeaderOptions from '@/core/entity/WindowHeaderOptions'

afterEach(() => cleanup())

describe('WindowHeaderOptions', () => {
	const options = [
		{ key: 'a', label: 'Alpha', onClick: vi.fn() },
		{ key: 'b', label: 'Beta', onClick: vi.fn(), isActive: true },
		{ key: 'c', label: 'Gamma', onClick: vi.fn() },
	]

	it('renders all options as buttons', () => {
		render(<WindowHeaderOptions options={options} />)
		expect(screen.getAllByRole('button')).toHaveLength(3)
		expect(screen.getByRole('button', { name: 'Alpha' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Beta' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Gamma' })).toBeDefined()
	})

	it('radio mode: active option uses pill-active, inactive uses pill-secondary', () => {
		render(<WindowHeaderOptions options={options} mode="radio" />)
		const alpha = screen.getByRole('button', { name: 'Alpha' })
		const beta = screen.getByRole('button', { name: 'Beta' })
		expect(alpha.getAttribute('data-variant')).toBe('pill-secondary')
		expect(beta.getAttribute('data-variant')).toBe('pill-active')
	})

	it('action mode: all options use pill-base', () => {
		render(<WindowHeaderOptions options={options} mode="action" />)
		for (const btn of screen.getAllByRole('button')) {
			expect(btn.getAttribute('data-variant')).toBe('pill-base')
		}
	})

	it('default mode is action', () => {
		render(<WindowHeaderOptions options={options} />)
		for (const btn of screen.getAllByRole('button')) {
			expect(btn.getAttribute('data-variant')).toBe('pill-base')
		}
	})

	it('click calls the option onClick handler', async () => {
		const user = userEvent.setup()
		const onClick = vi.fn()
		render(<WindowHeaderOptions options={[{ key: 'x', label: 'Click me', onClick }]} />)
		await user.click(screen.getByRole('button', { name: 'Click me' }))
		expect(onClick).toHaveBeenCalledOnce()
	})
})
