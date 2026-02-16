import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpaceHeader from '@/core/canvas/SpaceHeader'

describe('SpaceHeader', () => {
	afterEach(() => cleanup())

	it('renders the space name', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByText('Work')).toBeDefined()
	})

	it('has data-testid space-header', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByTestId('space-header')).toBeDefined()
	})

	it('renders favorite and switch pill buttons', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByRole('button', { name: 'Favorite space' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Switch space' })).toBeDefined()
	})

	it('calls onToggleFavorite when star button is clicked', () => {
		const onToggleFavorite = vi.fn()
		render(<SpaceHeader spaceName="Work" onToggleFavorite={onToggleFavorite} />)
		fireEvent.click(screen.getByRole('button', { name: 'Favorite space' }))
		expect(onToggleFavorite).toHaveBeenCalledOnce()
	})

	it('calls onSwitchSpace when swap button is clicked', () => {
		const onSwitchSpace = vi.fn()
		render(<SpaceHeader spaceName="Work" onSwitchSpace={onSwitchSpace} />)
		fireEvent.click(screen.getByRole('button', { name: 'Switch space' }))
		expect(onSwitchSpace).toHaveBeenCalledOnce()
	})
})
