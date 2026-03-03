import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActionChip from '@/core/chat/ActionChip'

describe('ActionChip', () => {
	afterEach(cleanup)

	it('shows spinner and tool label when pending', () => {
		render(<ActionChip tool="create_entity" status="pending" />)
		expect(screen.getByText(/creating entity/i)).toBeDefined()
		expect(screen.getByTestId('action-chip-spinner')).toBeDefined()
	})

	it('shows checkmark and result label when done', () => {
		render(
			<ActionChip
				tool="create_entity"
				status="done"
				result={{ id: 'e-1', summary: 'Grocery list' }}
			/>,
		)
		expect(screen.getByText(/created "Grocery list"/i)).toBeDefined()
		expect(screen.getByTestId('action-chip-check')).toBeDefined()
	})

	it('calls onFocusEntity when clicked and done', () => {
		const onFocus = vi.fn()
		render(
			<ActionChip
				tool="create_entity"
				status="done"
				result={{ id: 'e-1', summary: 'Note' }}
				onFocusEntity={onFocus}
			/>,
		)
		fireEvent.click(screen.getByRole('button'))
		expect(onFocus).toHaveBeenCalledWith('e-1')
	})

	it('is not clickable when pending', () => {
		render(<ActionChip tool="create_entity" status="pending" />)
		expect(screen.queryByRole('button')).toBeNull()
	})

	it('shows "Generating image..." when pending with image args', () => {
		render(<ActionChip tool="create_entity" status="pending" args={{ type: 'image' }} />)
		expect(screen.getByText('Generating image...')).toBeDefined()
	})

	it('shows entity type label when create_entity has a type', () => {
		render(<ActionChip tool="create_entity" status="pending" args={{ type: 'note' }} />)
		expect(screen.getByText('Creating note…')).toBeDefined()
	})

	it('shows entity type label for calendar type', () => {
		render(<ActionChip tool="create_entity" status="pending" args={{ type: 'calendar' }} />)
		expect(screen.getByText('Creating calendar…')).toBeDefined()
	})

	it('falls back to "Creating entity..." when no type arg', () => {
		render(<ActionChip tool="create_entity" status="pending" />)
		expect(screen.getByText('Creating entity...')).toBeDefined()
	})

	it('shows query context for query_entities with short query', () => {
		render(<ActionChip tool="query_entities" status="pending" args={{ query: 'project ideas' }} />)
		expect(screen.getByText('Searching for "project ideas"…')).toBeDefined()
	})

	it('falls back to generic label for query_entities with long query', () => {
		render(
			<ActionChip
				tool="query_entities"
				status="pending"
				args={{ query: 'this query is way too long to show inline here' }}
			/>,
		)
		expect(screen.getByText('Searching...')).toBeDefined()
	})

	it('shows query context for web_search with short query', () => {
		render(<ActionChip tool="web_search" status="pending" args={{ query: 'recipes' }} />)
		expect(screen.getByText('Searching "recipes"…')).toBeDefined()
	})

	it('falls back to generic label for web_search with long query', () => {
		render(
			<ActionChip
				tool="web_search"
				status="pending"
				args={{ query: 'this query is way too long to show inline here' }}
			/>,
		)
		expect(screen.getByText('Searching the web...')).toBeDefined()
	})
})
