'use client'

import { useEffect, useRef, useState } from 'react'
import { formatTime } from '@/apps/calendar/dateUtils'
import type { EventColor } from '@/apps/calendar/types'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { Button } from '@/core/ui/button'

const COLOR_OPTIONS: { value: EventColor; className: string }[] = [
	{ value: 'default', className: 'bg-primary' },
	{ value: 'warm', className: 'bg-agent' },
	{ value: 'cool', className: 'bg-primary/60' },
	{ value: 'muted', className: 'bg-on-surface-muted' },
]

interface EventDetailProps {
	event: CalendarEvent
	position: { x: number; y: number }
	onUpdate: (eventId: string, changes: Record<string, unknown>) => void
	onDelete: (eventId: string) => void
	onDismiss: () => void
}

export default function EventDetail({
	event,
	position,
	onUpdate,
	onDelete,
	onDismiss,
}: EventDetailProps) {
	const [title, setTitle] = useState(event.state.title)
	const popoverRef = useRef<HTMLDivElement>(null)

	// Escape to dismiss
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onDismiss()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onDismiss])

	// Click outside to dismiss
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				onDismiss()
			}
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [onDismiss])

	const handleTitleBlur = () => {
		const trimmed = title.trim()
		if (trimmed && trimmed !== event.state.title) {
			onUpdate(event.id, { title: trimmed })
		} else {
			setTitle(event.state.title)
		}
	}

	const handleColorChange = (color: EventColor) => {
		onUpdate(event.id, { color })
	}

	const style: React.CSSProperties = {
		position: 'fixed',
		left: Math.min(position.x, window.innerWidth - 280),
		top: Math.min(position.y, window.innerHeight - 320),
		zIndex: 50,
	}

	return (
		<div
			ref={popoverRef}
			className="w-64 rounded-md border border-outline/30 bg-surface-glass/80 p-3 shadow-elevated backdrop-blur-md"
			style={style}
			data-testid="event-detail"
		>
			{/* Editable title */}
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onBlur={handleTitleBlur}
				className="mb-2 w-full bg-transparent text-body font-medium text-on-surface outline-none"
				aria-label="Event title"
			/>

			{/* Time display */}
			<div className="mb-3 text-label text-on-surface-muted">
				{event.state.all_day
					? 'All day'
					: `${formatTime(event.state.start)} – ${formatTime(event.state.end)}`}
			</div>

			{/* Color picker */}
			<div className="mb-3 flex gap-2">
				{COLOR_OPTIONS.map((opt) => (
					<button
						type="button"
						key={opt.value}
						className={`size-5 rounded-full ${opt.className} ${
							(event.state.color ?? 'default') === opt.value
								? 'ring-2 ring-on-surface ring-offset-1'
								: ''
						}`}
						onClick={() => handleColorChange(opt.value)}
						aria-label={`Color ${opt.value}`}
					/>
				))}
			</div>

			{/* Content preview */}
			{event.content && (
				<div className="mb-3 line-clamp-3 text-label text-on-surface-muted">{event.content}</div>
			)}

			{/* Delete button */}
			<Button
				variant="ghost"
				size="sm"
				className="w-full text-error"
				onClick={() => onDelete(event.id)}
			>
				Delete event
			</Button>
		</div>
	)
}
