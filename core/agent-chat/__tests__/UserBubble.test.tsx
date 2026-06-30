import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import UserBubble from '@/core/chat/UserBubble'

describe('UserBubble', () => {
	afterEach(cleanup)

	it('renders user message text', () => {
		render(<UserBubble text="Make me a grocery list" />)
		expect(screen.getByText('Make me a grocery list')).toBeDefined()
	})

	it('is right-aligned', () => {
		const { container } = render(<UserBubble text="hello" />)
		const wrapper = container.firstElementChild as HTMLElement
		expect(wrapper.className).toContain('justify-end')
	})
})
