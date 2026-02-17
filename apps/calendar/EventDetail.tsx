'use client'

import { useEffect, useRef, useState } from 'react'
import { formatTime } from '@/apps/calendar/dateUtils'
import type { EventColor } from '@/apps/calendar/types'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import { Button } from '@/core/ui/button'
import { Input } from '@/core/ui/input'

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
	const isGoogleEvent = event.source === 'google'

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

	// Focus trap
	useEffect(() => {
		const handleTrap = (e: KeyboardEvent) => {
			if (e.key !== 'Tab' || !popoverRef.current) return
			const focusable = popoverRef.current.querySelectorAll<HTMLElement>(
				'input, button, [tabindex]:not([tabindex="-1"])',
			)
			if (focusable.length === 0) return
			const first = focusable[0]
			const last = focusable[focusable.length - 1]
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault()
				last.focus()
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', handleTrap)
		return () => document.removeEventListener('keydown', handleTrap)
	}, [])

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
			role="dialog"
			aria-label="Event details"
			className="w-64 rounded-md border border-outline/30 bg-surface-glass/80 p-3 shadow-elevated backdrop-blur-md"
			style={style}
			data-testid="event-detail"
		>
			<Input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				onBlur={handleTitleBlur}
				aria-label="Event title"
				className="mb-2 h-8 border-none bg-transparent text-body text-on-surface shadow-none outline-none"
			/>

			{/* Time display */}
			<div className="mb-3 text-label text-on-surface-muted">
				{event.state.all_day
					? 'All day'
					: `${formatTime(event.state.start)} – ${formatTime(event.state.end)}`}
			</div>

			{/* Color picker — local events only */}
			{!isGoogleEvent && (
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
			)}

			{/* Content preview */}
			{event.content && (
				<div className="mb-3 line-clamp-3 text-label text-on-surface-muted">{event.content}</div>
			)}

			<Button
				variant="ghost"
				size="sm"
				className="w-full text-error"
				onClick={() => onDelete(event.id)}
			>
				Delete event
			</Button>

			{isGoogleEvent && <div className="text-label text-on-surface-muted">Google Calendar</div>}
		</div>
	)
}
