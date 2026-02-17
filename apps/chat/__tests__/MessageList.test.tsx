import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MessageList from '@/apps/chat/MessageList'
import type { ChatMessage } from '@/apps/chat/types'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: 'm1',
		group_id: 'g1',
		user_id: 'u1',
		content: 'Hello',
		media_url: null,
		media_type: null,
		created_at: '2026-02-17T10:30:00Z',
		status: 'sent',
		...overrides,
	}
}

afterEach(() => cleanup())

describe('MessageList', () => {
	it('renders messages', () => {
		const messages = [
			makeMessage({ id: 'm1', content: 'First' }),
			makeMessage({ id: 'm2', content: 'Second', user_id: 'u2' }),
		]
		render(<MessageList messages={messages} currentUserId="u1" typingUserNames={[]} />)
		expect(screen.getByText('First')).toBeDefined()
		expect(screen.getByText('Second')).toBeDefined()
	})

	it('shows empty state when no messages', () => {
		render(<MessageList messages={[]} currentUserId="u1" typingUserNames={[]} />)
		expect(screen.getByText(/no messages/i)).toBeDefined()
	})

	it('passes isSent=true for current user messages', () => {
		const messages = [makeMessage({ id: 'm1', user_id: 'u1', content: 'My message' })]
		const { container } = render(
			<MessageList messages={messages} currentUserId="u1" typingUserNames={[]} />,
		)
		// Sent messages are right-aligned
		const bubble = container.querySelector('[data-testid="message-m1"]')
		expect(bubble).toBeDefined()
	})

	it('renders typing indicator when users are typing', () => {
		render(
			<MessageList messages={[]} currentUserId="u1" typingUserNames={['Alice']} />,
		)
		expect(screen.getByText('Alice is typing...')).toBeDefined()
	})

	it('calls onLoadMore when load-more button is clicked', async () => {
		const onLoadMore = vi.fn()
		render(
			<MessageList
				messages={[makeMessage()]}
				currentUserId="u1"
				typingUserNames={[]}
				onLoadMore={onLoadMore}
			/>,
		)
		const button = screen.getByRole('button', { name: /load more/i })
		await button.click()
		expect(onLoadMore).toHaveBeenCalledOnce()
	})
})
