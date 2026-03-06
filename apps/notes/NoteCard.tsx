'use client'

import type { AppProps } from '@/apps/_types'
import { useEntityStore } from '@/core/entityStore'

export default function NoteCard({ entityId }: AppProps) {
	const content = useEntityStore((s) => s.entities[entityId]?.content ?? '')

	return (
		<div className="p-3 h-full overflow-hidden">
			{content ? (
				<p className="text-sm text-on-surface line-clamp-[9] whitespace-pre-wrap">{content}</p>
			) : (
				<p className="text-sm text-on-surface-muted italic">Empty note</p>
			)}
		</div>
	)
}
