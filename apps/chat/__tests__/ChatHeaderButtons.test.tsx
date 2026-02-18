import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'

afterEach(() => cleanup())

function renderButtons(overrides: Partial<Parameters<typeof ChatHeaderButtons>[0]> = {}) {
	return render(
		<ChatHeaderButtons
			activeSidebar={null}
			onToggleGroups={vi.fn()}
			onToggleSettings={vi.fn()}
			{...overrides}
		/>,
	)
}

describe('ChatHeaderButtons', () => {
	it('renders Chats pill button', () => {
		renderButtons()
		expect(screen.getByRole('button', { name: /chats/i })).toBeDefined()
	})

	it('renders group name pill when activeGroupName is set', () => {
		renderButtons({ activeGroupName: 'Design Team' })
		expect(screen.getByRole('button', { name: /design team/i })).toBeDefined()
	})

	it('does not render group name pill when no active group', () => {
		renderButtons()
		expect(screen.queryByRole('button', { name: /design team/i })).toBeNull()
	})

	it('calls onToggleGroups when Chats pill is clicked', async () => {
		const onToggleGroups = vi.fn()
		const user = userEvent.setup()
		renderButtons({ onToggleGroups })
		await user.click(screen.getByRole('button', { name: /chats/i }))
		expect(onToggleGroups).toHaveBeenCalledOnce()
	})

	it('calls onToggleSettings when group name pill is clicked', async () => {
		const onToggleSettings = vi.fn()
		const user = userEvent.setup()
		renderButtons({ activeGroupName: 'General', onToggleSettings })
		await user.click(screen.getByRole('button', { name: /general/i }))
		expect(onToggleSettings).toHaveBeenCalledOnce()
	})

	it('uses pill-base variant when no sidebar is open', () => {
		renderButtons({ activeSidebar: null })
		const button = screen.getByRole('button', { name: /chats/i })
		expect(button.getAttribute('data-variant')).toBe('pill-base')
	})

	it('uses pill-active variant when groups sidebar is open', () => {
		renderButtons({ activeSidebar: 'groups' })
		const button = screen.getByRole('button', { name: /chats/i })
		expect(button.getAttribute('data-variant')).toBe('pill-active')
	})
})
