// core/chat/__tests__/ConversationPanel.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

	it('renders error state inline with partial turn preserved', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.appendTextDelta('Partial')
		store.setError('Rate limit exceeded')
		render(<ConversationPanel />)
		// Partial turn is preserved as a completed turn
		expect(screen.getByText('Error during response')).toBeDefined()
		// Error message renders inline
		expect(screen.getByText('Rate limit exceeded')).toBeDefined()
	})

	it('close button dismisses panel', () => {
		useConversationStore.getState().addUserTurn('hi')
		render(<ConversationPanel />)
		expect(screen.getByTestId('conversation-panel')).toBeDefined()
		fireEvent.click(screen.getByRole('button', { name: /close conversation/i }))
		expect(useConversationStore.getState().panelVisible).toBe(false)
	})

	it('dismisses panel on Escape key', () => {
		useConversationStore.getState().addUserTurn('hi')
		render(<ConversationPanel />)
		expect(screen.getByTestId('conversation-panel')).toBeDefined()
		fireEvent.keyDown(document, { key: 'Escape' })
		expect(useConversationStore.getState().panelVisible).toBe(false)
	})

	it('scroll area has scroll-fade with matching top/bottom inset padding', () => {
		useConversationStore.getState().addUserTurn('hi')
		const { container } = render(<ConversationPanel />)
		const scrollArea = container.querySelector('.scroll-fade') as HTMLElement
		expect(scrollArea.className).toContain('pt-10')
		expect(scrollArea.className).toContain('pb-10')
		expect(scrollArea.style.getPropertyValue('--scroll-fade-size')).toBe('2.5rem')
	})
})
