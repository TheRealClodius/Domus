import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import AgentTurn from '@/core/chat/AgentTurn'
import type { ConversationTurn } from '@/core/chat/conversationStore'

const turn: ConversationTurn = {
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
	summary: 'Created a grocery list note',
}

describe('AgentTurn', () => {
	afterEach(cleanup)

	it('renders collapsed summary by default', () => {
		render(<AgentTurn turn={turn} />)
		expect(screen.getByText('Created a grocery list note')).toBeDefined()
		expect(screen.queryByText(/Here is your grocery list/)).toBeNull()
	})

	it('expands to show full text and chips on click', () => {
		render(<AgentTurn turn={turn} />)
		fireEvent.click(screen.getByText('Created a grocery list note'))
		expect(screen.getByText(/Here is your grocery list/)).toBeDefined()
		expect(screen.getByText(/Created "Grocery list"/i)).toBeDefined()
	})

	it('collapses again on second click', () => {
		render(<AgentTurn turn={turn} />)
		const summary = screen.getByText('Created a grocery list note')
		fireEvent.click(summary)
		expect(screen.getByText(/Here is your grocery list/)).toBeDefined()
		fireEvent.click(summary)
		expect(screen.queryByText(/Here is your grocery list/)).toBeNull()
	})
})
