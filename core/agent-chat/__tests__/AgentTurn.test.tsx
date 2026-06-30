import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AgentTurn from '@/core/agent-chat/AgentTurn'
import type { ConversationTurn } from '@/core/agent-chat/conversationStore'

const turn: ConversationTurn = {
	id: 'turn-test',
	role: 'agent',
	text: 'Here is your grocery list with all the items you asked for.',
	toolCalls: [
		{
			id: 'tc-1',
			tool: 'create_entity',
			status: 'done',
			result: { id: 'e-1', summary: 'Grocery list' },
		},
	],
}

describe('AgentTurn', () => {
	afterEach(cleanup)

	it('renders text immediately without any interaction', () => {
		render(<AgentTurn turn={turn} />)
		expect(screen.getByText(/Here is your grocery list/)).toBeDefined()
	})

	it('renders tool chips immediately without any interaction', () => {
		render(<AgentTurn turn={turn} />)
		expect(screen.getByText(/Created "Grocery list"/i)).toBeDefined()
	})

	it('has no chevron button', () => {
		render(<AgentTurn turn={turn} />)
		expect(screen.queryByRole('button', { name: /expand|collapse/i })).toBeNull()
		expect(document.querySelector('[data-testid="chevron"]')).toBeNull()
	})
})
