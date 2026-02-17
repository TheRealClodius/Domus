import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatSidebar from '@/apps/chat/ChatSidebar'
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

describe('ChatSidebar — groups mode', () => {
	it('renders group list', () => {
		const groups = [makeGroup(), makeGroup({ id: 'g2', name: 'Random' })]
		render(
			<ChatSidebar
				mode="groups"
				groups={groups}
				activeGroupId="g1"
				unreadCounts={{}}
				onSelectGroup={vi.fn()}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByText('General')).toBeDefined()
		expect(screen.getByText('Random')).toBeDefined()
	})

	it('highlights active group', () => {
		render(
			<ChatSidebar
				mode="groups"
				groups={[makeGroup()]}
				activeGroupId="g1"
				unreadCounts={{}}
				onSelectGroup={vi.fn()}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		const button = screen.getByRole('button', { name: /general/i })
		expect(button.className).toContain('bg-surface-sunken')
	})

	it('calls onSelectGroup when a group is clicked', async () => {
		const onSelectGroup = vi.fn()
		const user = userEvent.setup()
		render(
			<ChatSidebar
				mode="groups"
				groups={[makeGroup()]}
				activeGroupId={null}
				unreadCounts={{}}
				onSelectGroup={onSelectGroup}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		await user.click(screen.getByRole('button', { name: /general/i }))
		expect(onSelectGroup).toHaveBeenCalledWith('g1')
	})

	it('shows unread badges', () => {
		render(
			<ChatSidebar
				mode="groups"
				groups={[makeGroup()]}
				activeGroupId={null}
				unreadCounts={{ g1: 5 }}
				onSelectGroup={vi.fn()}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByText('5')).toBeDefined()
	})

	it('has a create group button', () => {
		render(
			<ChatSidebar
				mode="groups"
				groups={[]}
				activeGroupId={null}
				unreadCounts={{}}
				onSelectGroup={vi.fn()}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByRole('button', { name: /new group/i })).toBeDefined()
	})

	it('has a join group button', () => {
		render(
			<ChatSidebar
				mode="groups"
				groups={[]}
				activeGroupId={null}
				unreadCounts={{}}
				onSelectGroup={vi.fn()}
				onCreateGroup={vi.fn()}
				onJoinGroup={vi.fn()}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByRole('button', { name: /join/i })).toBeDefined()
	})
})

describe('ChatSidebar — settings mode', () => {
	it('shows group name', () => {
		render(
			<ChatSidebar
				mode="settings"
				activeGroup={makeGroup({ name: 'Design Team' })}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByText('Design Team')).toBeDefined()
	})

	it('shows invite code', () => {
		render(
			<ChatSidebar
				mode="settings"
				activeGroup={makeGroup({ invite_code: 'xyz789' })}
				onClose={vi.fn()}
			/>,
		)
		expect(screen.getByText('xyz789')).toBeDefined()
	})

	it('has a copy invite code button', () => {
		render(<ChatSidebar mode="settings" activeGroup={makeGroup()} onClose={vi.fn()} />)
		expect(screen.getByRole('button', { name: /copy/i })).toBeDefined()
	})
})

describe('ChatSidebar — close', () => {
	it('calls onClose when close button is clicked in settings mode', async () => {
		const onClose = vi.fn()
		const user = userEvent.setup()
		render(<ChatSidebar mode="settings" activeGroup={makeGroup()} onClose={onClose} />)
		await user.click(screen.getByRole('button', { name: /close/i }))
		expect(onClose).toHaveBeenCalledOnce()
	})
})
