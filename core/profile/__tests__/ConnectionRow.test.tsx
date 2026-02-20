import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConnectionRow from '@/core/profile/ConnectionRow'

describe('ConnectionRow', () => {
	afterEach(cleanup)

	const baseProps = {
		icon: <span data-testid="test-icon">icon</span>,
		name: 'Google Calendar',
		isConnected: false,
		isLoading: false,
		onConnect: vi.fn(),
		onDisconnect: vi.fn(),
	}

	it('renders name and icon', () => {
		render(<ConnectionRow {...baseProps} />)
		expect(screen.getByText('Google Calendar')).toBeDefined()
		expect(screen.getByTestId('test-icon')).toBeDefined()
	})

	it('shows Connect button when disconnected', () => {
		render(<ConnectionRow {...baseProps} />)
		expect(screen.getByRole('button', { name: 'Connect' })).toBeDefined()
	})

	it('shows Disconnect button when connected', () => {
		render(<ConnectionRow {...baseProps} isConnected />)
		expect(screen.getByRole('button', { name: 'Disconnect' })).toBeDefined()
	})

	it('shows loading indicator when loading', () => {
		render(<ConnectionRow {...baseProps} isLoading />)
		expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull()
	})

	it('calls onConnect when Connect clicked', () => {
		const onConnect = vi.fn()
		render(<ConnectionRow {...baseProps} onConnect={onConnect} />)
		fireEvent.click(screen.getByRole('button', { name: 'Connect' }))
		expect(onConnect).toHaveBeenCalledOnce()
	})

	it('calls onDisconnect when Disconnect clicked', () => {
		const onDisconnect = vi.fn()
		render(<ConnectionRow {...baseProps} isConnected onDisconnect={onDisconnect} />)
		fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
		expect(onDisconnect).toHaveBeenCalledOnce()
	})

	it('uses name for data-testid', () => {
		render(<ConnectionRow {...baseProps} />)
		expect(screen.getByTestId('connection-google-calendar')).toBeDefined()
	})
})
