import { memo } from 'react'

interface TypingIndicatorProps {
	userNames: string[]
}

function formatTypingText(names: string[]): string {
	if (names.length === 0) return ''
	if (names.length === 1) return `${names[0]} is typing...`
	if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
	if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`
	return `${names[0]} and ${names.length - 1} others are typing...`
}

export default memo(function TypingIndicator({ userNames }: TypingIndicatorProps) {
	if (userNames.length === 0) return null

	return (
		<div role="status" className="px-3 py-1">
			<p className="text-label text-on-surface-muted animate-pulse">
				{formatTypingText(userNames)}
			</p>
		</div>
	)
})
