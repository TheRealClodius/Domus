import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatGroupModal from '@/apps/chat/ChatGroupModal'

afterEach(() => cleanup())

describe('ChatGroupModal — join mode', () => {
	it('renders heading and invite code input', () => {
		render(<ChatGroupModal mode="join" onClose={vi.fn()} />)
		expect(screen.getByText('Join a group')).toBeDefined()
		expect(screen.getByPlaceholderText('Invite code')).toBeDefined()
	})

	it('renders Join and Cancel buttons', () => {
		render(<ChatGroupModal mode="join" onClose={vi.fn()} />)
		expect(screen.getByRole('button', { name: /^join$/i })).toBeDefined()
		expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
	})

	it('calls onClose when Cancel is clicked', async () => {
		const onClose = vi.fn()
		const user = userEvent.setup()
		render(<ChatGroupModal mode="join" onClose={onClose} />)
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn()
		const user = userEvent.setup()
		render(<ChatGroupModal mode="join" onClose={onClose} />)
		await user.click(screen.getByRole('button', { name: /close/i }))
		expect(onClose).toHaveBeenCalledOnce()
	})
})

describe('ChatGroupModal — create mode', () => {
	it('renders heading and group name input', () => {
		render(<ChatGroupModal mode="create" onClose={vi.fn()} />)
		expect(screen.getByText('Create a new group')).toBeDefined()
		expect(screen.getByPlaceholderText('Group name')).toBeDefined()
	})

	it('renders Create and Cancel buttons', () => {
		render(<ChatGroupModal mode="create" onClose={vi.fn()} />)
		expect(screen.getByRole('button', { name: /^create$/i })).toBeDefined()
		expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
	})

	it('calls onClose when Cancel is clicked', async () => {
		const onClose = vi.fn()
		const user = userEvent.setup()
		render(<ChatGroupModal mode="create" onClose={onClose} />)
		await user.click(screen.getByRole('button', { name: /cancel/i }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn()
		const user = userEvent.setup()
		render(<ChatGroupModal mode="create" onClose={onClose} />)
		await user.click(screen.getByRole('button', { name: /close/i }))
		expect(onClose).toHaveBeenCalledOnce()
	})
})
