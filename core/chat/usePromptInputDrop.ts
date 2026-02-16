import { useCallback, useState } from 'react'

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

	const onDragEnter = useCallback((e: DragEvent) => {
		e.preventDefault()
		if (e.dataTransfer?.types.includes('Files')) {
			setIsDragOver(true)
		}
	}, [])

	const onDragOver = useCallback((e: DragEvent) => {
		e.preventDefault()
	}, [])

	const onDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
	}, [])

	const onDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault()
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
