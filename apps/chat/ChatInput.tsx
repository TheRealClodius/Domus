'use client'

import { Send } from 'lucide-react'
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

	const submit = useCallback(() => {
		const text = textareaRef.current?.value.trim()
		if (!text) return
		onSend(text)
		if (textareaRef.current) {
			textareaRef.current.value = ''
			textareaRef.current.style.height = 'auto'
		}
	}, [onSend])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				submit()
			}
		},
		[submit],
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
		<div className="flex justify-center px-1 py-2">
			<div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-surface-raised border border-outline w-full">
				<textarea
					ref={textareaRef}
					rows={1}
					disabled={disabled}
					placeholder={placeholder}
					onKeyDown={handleKeyDown}
					onInput={handleInput}
					className="flex-1 resize-none bg-transparent text-body text-on-surface placeholder:text-on-surface-muted outline-none"
					style={{ maxHeight: 120 }}
				/>
				<button
					type="button"
					onClick={submit}
					disabled={disabled}
					className="shrink-0 p-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
					aria-label="Send message"
				>
					<Send className="size-3.5" />
				</button>
			</div>
		</div>
	)
}
