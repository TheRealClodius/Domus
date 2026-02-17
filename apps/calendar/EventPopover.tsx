'use client'

import { useEffect, useRef, useState } from 'react'
import { formatTime } from '@/apps/calendar/dateUtils'
import { Button } from '@/core/ui/button'
import { Input } from '@/core/ui/input'

interface EventPopoverProps {
	/** Pre-filled start datetime from clicked slot (ISO string) */
	startDateTime: string
	/** Position to render at (click coordinates) */
	position: { x: number; y: number }
	onSave: (event: { title: string; start: string; end: string }) => void
	onDismiss: () => void
}

function defaultEndTime(start: string): string {
	const d = new Date(start)
	d.setHours(d.getHours() + 1)
	const y = d.getFullYear()
	const mo = String(d.getMonth() + 1).padStart(2, '0')
	const da = String(d.getDate()).padStart(2, '0')
	const h = String(d.getHours()).padStart(2, '0')
	const mi = String(d.getMinutes()).padStart(2, '0')
	const s = String(d.getSeconds()).padStart(2, '0')
	return `${y}-${mo}-${da}T${h}:${mi}:${s}`
}

export default function EventPopover({
	startDateTime,
	position,
	onSave,
	onDismiss,
}: EventPopoverProps) {
	const [title, setTitle] = useState('')
	const [error, setError] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)

	const endDateTime = defaultEndTime(startDateTime)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

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

	const handleSave = () => {
		const trimmed = title.trim()
		if (!trimmed) {
			setError('Title is required')
			return
		}
		onSave({ title: trimmed, start: startDateTime, end: endDateTime })
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSave()
		}
	}

	// Constrain to viewport bounds
	const style: React.CSSProperties = {
		position: 'fixed',
		left: Math.min(position.x, window.innerWidth - 280),
		top: Math.min(position.y, window.innerHeight - 200),
		zIndex: 50,
	}

	return (
		<div
			ref={popoverRef}
			role="dialog"
			aria-label="Create event"
			className="w-64 rounded-md border border-outline/30 bg-surface-glass/80 p-3 shadow-elevated backdrop-blur-md"
			style={style}
			data-testid="event-popover"
		>
			<Input
				ref={inputRef}
				type="text"
				value={title}
				onChange={(e) => {
					setTitle(e.target.value)
					setError('')
				}}
				onKeyDown={handleKeyDown}
				placeholder="Event title"
				className="mb-2 h-8 text-body"
			/>

			<div className="mb-3 text-label text-on-surface-muted">
				{formatTime(startDateTime)} – {formatTime(endDateTime)}
			</div>

			{error && <p className="mb-2 text-label text-error">{error}</p>}

			<Button variant="default" size="sm" className="w-full" onClick={handleSave}>
				Save
			</Button>
		</div>
	)
}
