import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApp } from '@/apps/chat'

describe('Chat app definition', () => {
	it('has correct type, name, and source', () => {
		expect(chatApp.type).toBe('chat')
		expect(chatApp.name).toBe('Chat')
		expect(chatApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(chatApp.defaultPresentation).toBe('window')
		expect(chatApp.defaultSize).toEqual({ width: 400, height: 500 })
	})
})

describe('ChatApp component', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders without crashing', () => {
		const Component = chatApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByText('Chat messages will appear here')).toBeDefined()
	})
})
