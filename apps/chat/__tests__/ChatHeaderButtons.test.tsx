import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'

afterEach(() => cleanup())

describe('ChatHeaderButtons', () => {
	it('renders Chats pill button', () => {
		render(
			<ChatHeaderButtons
				onToggleGroups={vi.fn()}
				onToggleSettings={vi.fn()}
			/>,
		)
		expect(screen.getByRole('button', { name: /chats/i })).toBeDefined()
	})

	it('renders group name pill when activeGroupName is set', () => {
		render(
			<ChatHeaderButtons
				activeGroupName="Design Team"
				onToggleGroups={vi.fn()}
				onToggleSettings={vi.fn()}
			/>,
		)
		expect(screen.getByRole('button', { name: /design team/i })).toBeDefined()
	})

	it('does not render group name pill when no active group', () => {
		render(
			<ChatHeaderButtons
				onToggleGroups={vi.fn()}
				onToggleSettings={vi.fn()}
			/>,
		)
		// Only the Chats button should exist
		const buttons = screen.getAllByRole('button')
		expect(buttons).toHaveLength(1)
	})

	it('calls onToggleGroups when Chats pill is clicked', async () => {
		const onToggleGroups = vi.fn()
		const user = userEvent.setup()
		render(
			<ChatHeaderButtons
				onToggleGroups={onToggleGroups}
				onToggleSettings={vi.fn()}
			/>,
		)
		await user.click(screen.getByRole('button', { name: /chats/i }))
		expect(onToggleGroups).toHaveBeenCalledOnce()
	})

	it('calls onToggleSettings when group name pill is clicked', async () => {
		const onToggleSettings = vi.fn()
		const user = userEvent.setup()
		render(
			<ChatHeaderButtons
				activeGroupName="General"
				onToggleGroups={vi.fn()}
				onToggleSettings={onToggleSettings}
			/>,
		)
		await user.click(screen.getByRole('button', { name: /general/i }))
		expect(onToggleSettings).toHaveBeenCalledOnce()
	})

	it('uses pill-base variant styling', () => {
		render(
			<ChatHeaderButtons
				onToggleGroups={vi.fn()}
				onToggleSettings={vi.fn()}
			/>,
		)
		const button = screen.getByRole('button', { name: /chats/i })
		expect(button.getAttribute('data-variant')).toBe('pill-base')
	})
})
