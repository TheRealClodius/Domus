import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GroupListItem from '@/apps/chat/GroupListItem'
import type { ChatGroup } from '@/apps/chat/types'

function makeGroup(overrides: Partial<ChatGroup> = {}): ChatGroup {
	return {
		id: 'g1',
		name: 'General',
		avatar_url: null,
		invite_code: 'abc123',
		created_by: 'u1',
		created_at: '2026-02-17T00:00:00Z',
		...overrides,
	}
}

afterEach(() => cleanup())

describe('GroupListItem', () => {
	it('renders group name', () => {
		render(<GroupListItem group={makeGroup()} onClick={vi.fn()} />)
		expect(screen.getByText('General')).toBeDefined()
	})

	it('shows avatar initial when no avatar_url', () => {
		render(<GroupListItem group={makeGroup()} onClick={vi.fn()} />)
		expect(screen.getByText('G')).toBeDefined()
	})

	it('shows avatar image when avatar_url is set', () => {
		render(
			<GroupListItem
				group={makeGroup({ avatar_url: 'https://example.com/avatar.png' })}
				onClick={vi.fn()}
			/>,
		)
		const img = screen.getByRole('img')
		expect(img.getAttribute('src')).toBe('https://example.com/avatar.png')
	})

	it('shows unread badge when unreadCount > 0', () => {
		render(<GroupListItem group={makeGroup()} unreadCount={3} onClick={vi.fn()} />)
		expect(screen.getByText('3')).toBeDefined()
	})

	it('hides unread badge when unreadCount is 0', () => {
		render(<GroupListItem group={makeGroup()} unreadCount={0} onClick={vi.fn()} />)
		expect(screen.queryByTestId('unread-badge')).toBeNull()
	})

	it('shows preview text when provided', () => {
		render(
			<GroupListItem group={makeGroup()} preview="Last message here" onClick={vi.fn()} />,
		)
		expect(screen.getByText('Last message here')).toBeDefined()
	})

	it('shows timestamp when provided', () => {
		render(<GroupListItem group={makeGroup()} timestamp="10:30 AM" onClick={vi.fn()} />)
		expect(screen.getByText('10:30 AM')).toBeDefined()
	})

	it('calls onClick when clicked', async () => {
		const onClick = vi.fn()
		const user = userEvent.setup()
		render(<GroupListItem group={makeGroup()} onClick={onClick} />)

		await user.click(screen.getByRole('button'))
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('highlights active group', () => {
		const { container } = render(
			<GroupListItem group={makeGroup()} onClick={vi.fn()} isActive />,
		)
		const button = screen.getByRole('button')
		expect(button.className).toContain('bg-surface-sunken')
	})
})
