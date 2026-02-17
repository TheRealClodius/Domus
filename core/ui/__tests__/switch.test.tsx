import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Switch } from '@/core/ui/switch'

describe('Switch', () => {
	afterEach(() => cleanup())

	it('renders switch role', () => {
		render(<Switch />)
		expect(screen.getByRole('switch')).toBeDefined()
	})

	it('renders label', () => {
		render(<Switch label="Mute" />)
		expect(screen.getByText('Mute')).toBeDefined()
	})

	it('label htmlFor associates with switch', () => {
		render(<Switch label="Mute" />)
		const label = screen.getByText('Mute')
		const switchEl = screen.getByRole('switch')
		expect(label.getAttribute('for')).toBe(switchEl.id)
	})

	it('no label wrapper when label omitted', () => {
		const { container } = render(<Switch />)
		expect(container.querySelector('label')).toBeNull()
	})

	it('onCheckedChange fires', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(<Switch onCheckedChange={onChange} />)
		await user.click(screen.getByRole('switch'))
		expect(onChange).toHaveBeenCalledOnce()
	})

	it('respects checked prop', () => {
		render(<Switch checked={true} onCheckedChange={() => {}} />)
		expect(screen.getByRole('switch').getAttribute('data-state')).toBe('checked')
	})

	it('merges className', () => {
		render(<Switch className="custom-class" />)
		expect(screen.getByRole('switch').className).toContain('custom-class')
	})

	it('disabled state', () => {
		render(<Switch disabled />)
		expect(screen.getByRole('switch')).toBeDisabled()
	})
})
