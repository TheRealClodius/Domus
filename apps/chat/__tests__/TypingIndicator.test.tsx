import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import TypingIndicator from '@/apps/chat/TypingIndicator'

afterEach(() => cleanup())

describe('TypingIndicator', () => {
	it('renders nothing when no users are typing', () => {
		const { container } = render(<TypingIndicator userNames={[]} />)
		expect(container.textContent).toBe('')
	})

	it('shows "X is typing..." for one user', () => {
		render(<TypingIndicator userNames={['Alice']} />)
		expect(screen.getByText('Alice is typing...')).toBeDefined()
	})

	it('shows "X and Y are typing..." for two users', () => {
		render(<TypingIndicator userNames={['Alice', 'Bob']} />)
		expect(screen.getByText('Alice and Bob are typing...')).toBeDefined()
	})

	it('shows "X, Y, and Z are typing..." for three users', () => {
		render(<TypingIndicator userNames={['Alice', 'Bob', 'Charlie']} />)
		expect(screen.getByText('Alice, Bob, and Charlie are typing...')).toBeDefined()
	})

	it('shows "X and N others are typing..." for 4+ users', () => {
		render(<TypingIndicator userNames={['Alice', 'Bob', 'Charlie', 'Dave']} />)
		expect(screen.getByText('Alice and 3 others are typing...')).toBeDefined()
	})

	it('has accessible role', () => {
		render(<TypingIndicator userNames={['Alice']} />)
		expect(screen.getByRole('status')).toBeDefined()
	})
})
