import { useCallback, useMemo, useState } from 'react'

export type PromptInputLayout = 'IDLE' | 'CLICKED' | 'BIG'

export interface ContextItem {
	id: string
	file: File
	name: string
	type: 'image' | 'document' | 'clipboard'
	status: 'loading' | 'ready' | 'error'
	preview?: string
	error?: string
}

const MAX_CONTEXT_ITEMS = 10

export function usePromptInputState() {
	const [layout, setLayout] = useState<PromptInputLayout>('IDLE')
	const [text, setText] = useState('')
	const [contextItems, setContextItems] = useState<ContextItem[]>([])
	const [menuOpen, setMenuOpen] = useState(false)
	const [isComposing, setComposing] = useState(false)

	const addContextItem = useCallback((item: ContextItem) => {
		setContextItems((prev) => {
			if (prev.length >= MAX_CONTEXT_ITEMS) return prev
			return [...prev, item]
		})
	}, [])

	const removeContextItem = useCallback((id: string) => {
		setContextItems((prev) => prev.filter((item) => item.id !== id))
	}, [])

	const updateContextItem = useCallback((id: string, patch: Partial<ContextItem>) => {
		setContextItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
	}, [])

	const reset = useCallback(() => {
		setLayout('IDLE')
		setText('')
		setContextItems([])
		setMenuOpen(false)
		setComposing(false)
	}, [])

	const canSend = useMemo(
		() => text.trim() !== '' || contextItems.length > 0,
		[text, contextItems.length],
	)

	return {
		layout,
		setLayout,
		text,
		setText,
		contextItems,
		menuOpen,
		setMenuOpen,
		isComposing,
		setComposing,
		addContextItem,
		removeContextItem,
		updateContextItem,
		reset,
		canSend,
	}
}
