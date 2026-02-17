'use client'

import { type KeyboardEvent, useCallback, useRef } from 'react'

interface ChatInputProps {
	onSend: (text: string) => void
	onTyping?: () => void
	disabled?: boolean
	placeholder?: string
}

export default function ChatInput({
	onSend,
	onTyping,
	disabled = false,
	placeholder = 'Type a message...',
}: ChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				const text = textareaRef.current?.value.trim()
				if (!text) return
				onSend(text)
				if (textareaRef.current) {
					textareaRef.current.value = ''
					textareaRef.current.style.height = 'auto'
				}
			}
		},
		[onSend],
	)

	const handleInput = useCallback(() => {
		const ta = textareaRef.current
		if (!ta) return
		// Auto-resize
		ta.style.height = 'auto'
		ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
		onTyping?.()
	}, [onTyping])

	return (
		<div className="flex items-end gap-2 border-t border-outline px-3 py-2 bg-surface-raised">
			<textarea
				ref={textareaRef}
				role="textbox"
				rows={1}
				disabled={disabled}
				placeholder={placeholder}
				onKeyDown={handleKeyDown}
				onInput={handleInput}
				className="flex-1 resize-none bg-transparent text-body text-on-surface placeholder:text-on-surface-muted outline-none py-1.5"
				style={{ maxHeight: 120 }}
			/>
		</div>
	)
}
