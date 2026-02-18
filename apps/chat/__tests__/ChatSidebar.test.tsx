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

const groupsDefaults = {
	mode: 'groups' as const,
	groups: [makeGroup()],
	activeGroupId: null as string | null,
	unreadCounts: {} as Record<string, number>,
	onSelectGroup: vi.fn(),
	onOpenJoinModal: vi.fn(),
	onOpenCreateModal: vi.fn(),
	onClose: vi.fn(),
}

afterEach(() => cleanup())

describe('ChatSidebar — groups mode', () => {
	it('renders group list', () => {
		const groups = [makeGroup(), makeGroup({ id: 'g2', name: 'Random' })]
		render(<ChatSidebar {...groupsDefaults} groups={groups} activeGroupId="g1" />)
		expect(screen.getByText('General')).toBeDefined()
		expect(screen.getByText('Random')).toBeDefined()
	})

	it('highlights active group', () => {
		render(<ChatSidebar {...groupsDefaults} activeGroupId="g1" />)
		const button = screen.getByRole('button', { name: /general/i })
		expect(button.className).toContain('bg-surface-sunken')
	})

	it('calls onSelectGroup when a group is clicked', async () => {
		const onSelectGroup = vi.fn()
		const user = userEvent.setup()
		render(<ChatSidebar {...groupsDefaults} onSelectGroup={onSelectGroup} />)
		await user.click(screen.getByRole('button', { name: /general/i }))
		expect(onSelectGroup).toHaveBeenCalledWith('g1')
	})

	it('shows unread badges', () => {
		render(<ChatSidebar {...groupsDefaults} unreadCounts={{ g1: 5 }} />)
		expect(screen.getByText('5')).toBeDefined()
	})

	it('renders Join group and New group action buttons', () => {
		render(<ChatSidebar {...groupsDefaults} />)
		expect(screen.getByRole('button', { name: /join group/i })).toBeDefined()
		expect(screen.getByRole('button', { name: /new group/i })).toBeDefined()
	})

	it('calls onOpenJoinModal when Join group is clicked', async () => {
		const onOpenJoinModal = vi.fn()
		const user = userEvent.setup()
		render(<ChatSidebar {...groupsDefaults} onOpenJoinModal={onOpenJoinModal} />)
		await user.click(screen.getByRole('button', { name: /join group/i }))
		expect(onOpenJoinModal).toHaveBeenCalledOnce()
	})

	it('calls onOpenCreateModal when New group is clicked', async () => {
		const onOpenCreateModal = vi.fn()
		const user = userEvent.setup()
		render(<ChatSidebar {...groupsDefaults} onOpenCreateModal={onOpenCreateModal} />)
		await user.click(screen.getByRole('button', { name: /new group/i }))
		expect(onOpenCreateModal).toHaveBeenCalledOnce()
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
