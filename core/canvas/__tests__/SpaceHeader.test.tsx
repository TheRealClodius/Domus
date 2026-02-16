import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpaceHeader from '@/core/canvas/SpaceHeader'
import { useSheetStore } from '@/core/sheetStore'

describe('SpaceHeader', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

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

	it('renders sign-in button that opens login sheet', () => {
		render(<SpaceHeader spaceName="Work" />)
		const signInButton = screen.getByRole('button', { name: 'Sign in' })
		expect(signInButton).toBeDefined()
		fireEvent.click(signInButton)
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.contentType).toBe('login')
	})
})
