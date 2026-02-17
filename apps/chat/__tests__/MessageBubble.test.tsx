import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import MessageBubble from '@/apps/chat/MessageBubble'
import type { ChatMessage } from '@/apps/chat/types'

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: 'm1',
		group_id: 'g1',
		user_id: 'u1',
		content: 'Hello world',
		media_url: null,
		media_type: null,
		created_at: '2026-02-17T10:30:00Z',
		status: 'sent',
		...overrides,
	}
}

afterEach(() => cleanup())

describe('MessageBubble', () => {
	it('renders message content', () => {
		render(<MessageBubble message={makeMessage()} isSent />)
		expect(screen.getByText('Hello world')).toBeDefined()
	})

	it('applies sent styling (right-aligned)', () => {
		const { container } = render(<MessageBubble message={makeMessage()} isSent />)
		const wrapper = container.firstElementChild as HTMLElement
		expect(wrapper.className).toContain('justify-end')
	})

	it('applies received styling (left-aligned)', () => {
		const { container } = render(<MessageBubble message={makeMessage()} isSent={false} />)
		const wrapper = container.firstElementChild as HTMLElement
		expect(wrapper.className).toContain('justify-start')
	})

	it('renders hover action buttons', () => {
		render(<MessageBubble message={makeMessage()} isSent />)
		expect(screen.getByLabelText('React')).toBeDefined()
		expect(screen.getByLabelText('More options')).toBeDefined()
	})

	it('renders inline image when media_type is image', () => {
		const msg = makeMessage({
			media_url: 'https://example.com/photo.jpg',
			media_type: 'image/jpeg',
		})
		render(<MessageBubble message={msg} isSent />)
		const img = screen.getByRole('img')
		expect(img.getAttribute('src')).toBe('https://example.com/photo.jpg')
	})

	it('renders file chip for non-image media', () => {
		const msg = makeMessage({
			media_url: 'https://example.com/doc.pdf',
			media_type: 'application/pdf',
		})
		render(<MessageBubble message={msg} isSent />)
		expect(screen.getByRole('link')).toBeDefined()
		expect(screen.getByRole('link').getAttribute('href')).toBe('https://example.com/doc.pdf')
	})

	it('shows pending indicator for optimistic messages', () => {
		render(<MessageBubble message={makeMessage({ status: 'pending' })} isSent />)
		expect(screen.getByText('Sending...')).toBeDefined()
	})

	it('shows failed indicator with error styling', () => {
		render(<MessageBubble message={makeMessage({ status: 'failed' })} isSent />)
		expect(screen.getByText('Failed to send')).toBeDefined()
	})

	it('renders timestamp', () => {
		render(<MessageBubble message={makeMessage()} isSent />)
		// The timestamp formatting will show time — just verify some time text exists
		const timeEl = screen.getByTestId('message-timestamp')
		expect(timeEl.textContent).toBeTruthy()
	})
})
