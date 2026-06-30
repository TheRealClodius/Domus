import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PromptInput from '@/core/agent-chat/PromptInput'
import type { ContextItem } from '@/core/agent-chat/usePromptInputState'

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		text: '',
		onTextChange: vi.fn(),
		onSend: vi.fn(),
		contextItems: [] as ContextItem[],
		onAddContextItem: vi.fn(),
		onRemoveContextItem: vi.fn(),
		isGenerating: false,
		onStop: vi.fn(),
		...overrides,
	}
}

describe('PromptInput', () => {
	afterEach(() => cleanup())

	it('renders a textarea with placeholder', () => {
		render(<PromptInput {...makeProps()} />)
		expect(screen.getByPlaceholderText('Message...')).toBeDefined()
	})

	it('renders a send button', () => {
		render(<PromptInput {...makeProps()} />)
		expect(screen.getByRole('button', { name: /send/i })).toBeDefined()
	})

	it('calls onTextChange when typing', () => {
		const onTextChange = vi.fn()
		render(<PromptInput {...makeProps({ onTextChange })} />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'hello' } })
		expect(onTextChange).toHaveBeenCalledWith('hello')
	})

	it('Enter calls onSend when text is non-empty', () => {
		const onSend = vi.fn()
		render(<PromptInput {...makeProps({ text: 'hello', onSend })} />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
		expect(onSend).toHaveBeenCalled()
	})

	it('Enter does not call onSend when text is empty', () => {
		const onSend = vi.fn()
		render(<PromptInput {...makeProps({ text: '', onSend })} />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
		expect(onSend).not.toHaveBeenCalled()
	})

	it('Shift+Enter does not call onSend', () => {
		const onSend = vi.fn()
		render(<PromptInput {...makeProps({ text: 'hello', onSend })} />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
		expect(onSend).not.toHaveBeenCalled()
	})

	it('shows stop button when isGenerating is true', () => {
		render(<PromptInput {...makeProps({ isGenerating: true })} />)
		expect(screen.getByRole('button', { name: /stop/i })).toBeDefined()
	})

	it('calls onStop when stop button is clicked', () => {
		const onStop = vi.fn()
		render(<PromptInput {...makeProps({ isGenerating: true, onStop })} />)
		fireEvent.click(screen.getByRole('button', { name: /stop/i }))
		expect(onStop).toHaveBeenCalled()
	})

	it('renders context item chips when contextItems are provided', () => {
		const items: ContextItem[] = [
			{
				id: 'c1',
				file: new File([''], 'doc.pdf', { type: 'application/pdf' }),
				name: 'doc.pdf',
				type: 'document',
				status: 'ready',
			},
		]
		render(<PromptInput {...makeProps({ contextItems: items })} />)
		expect(screen.getByText('PDF')).toBeDefined()
	})

	it('renders the add attachment button', () => {
		render(<PromptInput {...makeProps()} />)
		expect(screen.getByRole('button', { name: /add attachment/i })).toBeDefined()
	})

	it('accepts a custom placeholder', () => {
		render(<PromptInput {...makeProps({ placeholder: 'Ask anything...' })} />)
		expect(screen.getByPlaceholderText('Ask anything...')).toBeDefined()
	})

	it('renders exactly one textarea regardless of layout state', () => {
		// Start in BIG (has context items)
		const items: ContextItem[] = [
			{
				id: 'c1',
				file: new File([''], 'img.png', { type: 'image/png' }),
				name: 'img.png',
				type: 'image',
				status: 'ready',
			},
		]
		const { container } = render(<PromptInput {...makeProps({ contextItems: items })} />)
		const textareas = container.querySelectorAll('textarea')
		expect(textareas).toHaveLength(1)
	})

	it('renders exactly one textarea in idle state', () => {
		const { container } = render(<PromptInput {...makeProps()} />)
		const textareas = container.querySelectorAll('textarea')
		expect(textareas).toHaveLength(1)
	})
})
