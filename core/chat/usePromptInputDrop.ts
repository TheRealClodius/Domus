import { useCallback, useRef, useState } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

interface UsePromptInputDropOptions {
	onFilesAccepted: (files: File[]) => void
	maxItems: number
	currentCount: number
}

export function usePromptInputDrop({
	onFilesAccepted,
	maxItems,
	currentCount,
}: UsePromptInputDropOptions) {
	const [isDragOver, setIsDragOver] = useState(false)
	// Counter-based tracking: dragenter/dragleave fire on every child boundary.
	// Increment on enter, decrement on leave — isDragOver when counter > 0.
	const dragCounterRef = useRef(0)

	const onDragEnter = useCallback((e: DragEvent) => {
		e.preventDefault()
		if (!e.dataTransfer?.types.includes('Files')) return
		dragCounterRef.current++
		if (dragCounterRef.current === 1) {
			setIsDragOver(true)
		}
	}, [])

	const onDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()
	}, [])

	const onDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault()
		dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
		if (dragCounterRef.current === 0) {
			setIsDragOver(false)
		}
	}, [])

	const onDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
			dragCounterRef.current = 0
			setIsDragOver(false)

			const files = Array.from(e.dataTransfer?.files ?? [])
			const remaining = maxItems - currentCount
			const valid = files.filter((f) => f.size <= MAX_FILE_SIZE).slice(0, Math.max(0, remaining))

			onFilesAccepted(valid)
		},
		[onFilesAccepted, maxItems, currentCount],
	)

	return {
		isDragOver,
		dropHandlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
	}
}
