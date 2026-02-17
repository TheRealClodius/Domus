import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import ChatAuthGate from '@/apps/chat/ChatAuthGate'
import { useSheetStore } from '@/core/sheetStore'

afterEach(() => {
	cleanup()
	useSheetStore.getState().close()
})

describe('ChatAuthGate', () => {
	it('renders children when authenticated', () => {
		render(
			<ChatAuthGate isAuthenticated>
				<div>Chat content</div>
			</ChatAuthGate>,
		)
		expect(screen.getByText('Chat content')).toBeDefined()
	})

	it('does not render children when not authenticated', () => {
		render(
			<ChatAuthGate isAuthenticated={false}>
				<div>Chat content</div>
			</ChatAuthGate>,
		)
		expect(screen.queryByText('Chat content')).toBeNull()
	})

	it('shows sign-in prompt when not authenticated', () => {
		render(
			<ChatAuthGate isAuthenticated={false}>
				<div>Chat content</div>
			</ChatAuthGate>,
		)
		expect(screen.getByText(/sign in/i)).toBeDefined()
	})

	it('renders Log in button that opens login sheet', async () => {
		const user = userEvent.setup()
		render(
			<ChatAuthGate isAuthenticated={false}>
				<div>Chat content</div>
			</ChatAuthGate>,
		)
		const button = screen.getByRole('button', { name: /log in/i })
		expect(button).toBeDefined()

		await user.click(button)
		const sheet = useSheetStore.getState()
		expect(sheet.isOpen).toBe(true)
		expect(sheet.contentType).toBe('login')
	})

	it('does not show sign-in prompt when authenticated', () => {
		render(
			<ChatAuthGate isAuthenticated>
				<div>Chat content</div>
			</ChatAuthGate>,
		)
		expect(screen.queryByText(/sign in/i)).toBeNull()
	})
})
