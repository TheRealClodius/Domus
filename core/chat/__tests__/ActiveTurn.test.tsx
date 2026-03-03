// core/chat/__tests__/ActiveTurn.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ActiveTurn from '@/core/chat/ActiveTurn'

describe('ActiveTurn', () => {
	afterEach(cleanup)

	it('renders streaming text', () => {
		render(<ActiveTurn text="Here is your grocery" toolCalls={[]} />)
		expect(screen.getByText('Here is your grocery')).toBeDefined()
	})

	it('renders pending tool call chip', () => {
		render(
			<ActiveTurn
				text=""
				toolCalls={[{ id: 'tc-1', tool: 'create_entity', status: 'pending', result: null }]}
			/>,
		)
		expect(screen.getByText(/creating entity/i)).toBeDefined()
	})

	it('renders resolved tool call chip alongside text', () => {
		render(
			<ActiveTurn
				text="Here it is"
				toolCalls={[
					{
						id: 'tc-1',
						tool: 'create_entity',
						status: 'done',
						result: { id: 'e-1', summary: 'Note' },
					},
				]}
			/>,
		)
		expect(screen.getByText('Here it is')).toBeDefined()
		expect(screen.getByText(/Created "Note"/i)).toBeDefined()
	})

	it('renders coalescing shimmer chip when text is empty and no tool calls', () => {
		render(<ActiveTurn text="" toolCalls={[]} />)
		expect(screen.getByTestId('coalescing-chip')).toBeDefined()
		expect(screen.getByText('Coalescing…')).toBeDefined()
	})

	it('does not render shimmer chip when text has content', () => {
		render(<ActiveTurn text="Hello" toolCalls={[]} />)
		expect(screen.queryByTestId('coalescing-chip')).toBeNull()
	})

	it('does not render shimmer chip when tool calls are present', () => {
		render(
			<ActiveTurn
				text=""
				toolCalls={[{ id: 'tc-1', tool: 'create_entity', status: 'pending', result: null }]}
			/>,
		)
		expect(screen.queryByTestId('coalescing-chip')).toBeNull()
	})

	it('passes args to ActionChip for richer labels', () => {
		render(
			<ActiveTurn
				text=""
				toolCalls={[
					{
						id: 'tc-1',
						tool: 'create_entity',
						status: 'pending',
						result: null,
						args: { type: 'image' },
					},
				]}
			/>,
		)
		expect(screen.getByText('Generating image...')).toBeDefined()
	})
})
