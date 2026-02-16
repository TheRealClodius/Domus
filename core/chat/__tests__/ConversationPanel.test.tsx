// core/chat/__tests__/ConversationPanel.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ConversationPanel from '@/core/chat/ConversationPanel'
import { useConversationStore } from '@/core/chat/conversationStore'

describe('ConversationPanel', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
	})

	it('renders nothing when panelVisible is false', () => {
		const { container } = render(<ConversationPanel />)
		expect(container.querySelector('[data-testid="conversation-panel"]')).toBeNull()
	})

	it('renders panel when panelVisible is true', () => {
		useConversationStore.getState().addUserTurn('hello')
		render(<ConversationPanel />)
		expect(screen.getByTestId('conversation-panel')).toBeDefined()
	})

	it('renders user messages', () => {
		useConversationStore.getState().addUserTurn('Make me a note')
		render(<ConversationPanel />)
		expect(screen.getByText('Make me a note')).toBeDefined()
	})

	it('renders completed agent turns as summaries', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.appendTextDelta('Hello there!')
		store.completeTurn('Said hello')
		render(<ConversationPanel />)
		expect(screen.getByText('Said hello')).toBeDefined()
	})

	it('renders active turn with streaming text', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.appendTextDelta('I am streaming...')
		render(<ConversationPanel />)
		expect(screen.getByText('I am streaming...')).toBeDefined()
	})

	it('renders error state inline', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.setError('Rate limit exceeded')
		render(<ConversationPanel />)
		expect(screen.getByText(/rate limit exceeded/i)).toBeDefined()
	})
})
