import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MenuCard, MenuCardItem } from '@/core/ui/menu-card'

describe('MenuCard', () => {
	afterEach(() => cleanup())

	it('renders children', () => {
		render(<MenuCard>Hello</MenuCard>)
		expect(screen.getByText('Hello')).toBeDefined()
	})

	it('has data-testid menu-card', () => {
		render(<MenuCard>Content</MenuCard>)
		expect(screen.getByTestId('menu-card')).toBeDefined()
	})

	it('merges custom className', () => {
		render(<MenuCard className="custom-class">Content</MenuCard>)
		expect(screen.getByTestId('menu-card').className).toContain('custom-class')
	})
})

describe('MenuCardItem', () => {
	afterEach(() => cleanup())

	it('renders title and description', () => {
		render(<MenuCardItem title="Upload" description="Add files to this space" />)
		expect(screen.getByText('Upload')).toBeDefined()
		expect(screen.getByText('Add files to this space')).toBeDefined()
	})

	it('renders optional icon slot', () => {
		render(
			<MenuCardItem title="Upload" description="desc" icon={<div data-testid="custom-icon" />} />,
		)
		expect(screen.getByTestId('custom-icon')).toBeDefined()
	})

	it('renders without icon', () => {
		const { container } = render(<MenuCardItem title="Invite" description="Collaborate" />)
		expect(container.querySelector('[data-slot="menu-card-icon"]')).toBeNull()
	})

	it('is a button and calls onClick', async () => {
		const user = userEvent.setup()
		const onClick = vi.fn()
		render(<MenuCardItem title="Upload" description="desc" onClick={onClick} />)
		await user.click(screen.getByRole('button', { name: /upload/i }))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('title uses display font', () => {
		render(<MenuCardItem title="Upload" description="desc" />)
		const title = screen.getByText('Upload')
		expect(title.className).toContain('font-display')
	})
})
