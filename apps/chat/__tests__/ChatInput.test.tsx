import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatInput from '@/apps/chat/ChatInput'

afterEach(() => cleanup())

describe('ChatInput', () => {
	it('renders a text input', () => {
		render(<ChatInput onSend={vi.fn()} />)
		expect(screen.getByRole('textbox')).toBeDefined()
	})

	it('calls onSend with text on Enter', async () => {
		const onSend = vi.fn()
		const user = userEvent.setup()
		render(<ChatInput onSend={onSend} />)

		const input = screen.getByRole('textbox')
		await user.type(input, 'Hello{Enter}')
		expect(onSend).toHaveBeenCalledWith('Hello')
	})

	it('does not send on Shift+Enter (newline)', async () => {
		const onSend = vi.fn()
		const user = userEvent.setup()
		render(<ChatInput onSend={onSend} />)

		const input = screen.getByRole('textbox')
		await user.type(input, 'Hello{Shift>}{Enter}{/Shift}')
		expect(onSend).not.toHaveBeenCalled()
	})

	it('clears input after sending', async () => {
		const onSend = vi.fn()
		const user = userEvent.setup()
		render(<ChatInput onSend={onSend} />)

		const input = screen.getByRole('textbox') as HTMLTextAreaElement
		await user.type(input, 'Hello{Enter}')
		expect(input.value).toBe('')
	})

	it('does not send empty messages', async () => {
		const onSend = vi.fn()
		const user = userEvent.setup()
		render(<ChatInput onSend={onSend} />)

		const input = screen.getByRole('textbox')
		await user.type(input, '{Enter}')
		expect(onSend).not.toHaveBeenCalled()
	})

	it('calls onTyping when user types', async () => {
		const onTyping = vi.fn()
		const user = userEvent.setup()
		render(<ChatInput onSend={vi.fn()} onTyping={onTyping} />)

		const input = screen.getByRole('textbox')
		await user.type(input, 'H')
		expect(onTyping).toHaveBeenCalled()
	})

	it('disables input when disabled prop is true', () => {
		render(<ChatInput onSend={vi.fn()} disabled />)
		const input = screen.getByRole('textbox') as HTMLTextAreaElement
		expect(input.disabled).toBe(true)
	})
})
