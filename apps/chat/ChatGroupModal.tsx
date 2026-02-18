'use client'

import { Camera, UserPlus, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/core/ui/button'
import { Input } from '@/core/ui/input'

interface ChatGroupModalProps {
	mode: 'join' | 'create'
	onClose: () => void
}

export default function ChatGroupModal({ mode, onClose }: ChatGroupModalProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onClose])

	if (mode === 'join') return <JoinContent onClose={onClose} />
	return <CreateContent onClose={onClose} />
}

function CloseButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Close"
			className="absolute top-4 left-4 size-8 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
		>
			<X className="size-4" />
		</button>
	)
}

function JoinContent({ onClose }: { onClose: () => void }) {
	return (
		<div className="h-full bg-surface flex flex-col items-center justify-center p-6 relative">
			<CloseButton onClick={onClose} />
			<div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
				<UserPlus className="size-7 text-primary" />
			</div>
			<h2 className="text-heading text-on-surface mb-2">Join a group</h2>
			<p className="text-body-sm text-on-surface-muted text-center max-w-xs mb-6">
				Enter the invite code shared by your group admin to join an existing group.
			</p>
			<Input placeholder="Invite code" className="max-w-xs w-full bg-surface-sunken mb-4" />
			<div className="flex items-center gap-2">
				<Button variant="pill-active" size="pill" disabled>
					Join
				</Button>
				<Button variant="ghost" size="pill" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	)
}

function CreateContent({ onClose }: { onClose: () => void }) {
	return (
		<div className="h-full bg-surface flex flex-col items-center justify-center p-6 relative">
			<CloseButton onClick={onClose} />
			<div className="size-20 rounded-full bg-surface-sunken flex items-center justify-center mb-5">
				<Camera className="size-6 text-on-surface-muted" />
			</div>
			<h2 className="text-heading text-on-surface mb-4">Create a new group</h2>
			<Input placeholder="Group name" className="max-w-xs w-full bg-surface-sunken mb-6" />
			<div className="w-full max-w-xs border-t border-outline pt-4 mb-4">
				<h3 className="text-label text-on-surface mb-1">Invite members</h3>
				<p className="text-body-sm text-on-surface-muted mb-3">
					Share an invite code or enter email addresses of people you want to invite.
				</p>
				<div className="bg-surface-sunken rounded-md px-3 py-2 mb-3 font-mono text-body-sm text-on-surface-muted select-all">
					— invite code will appear here —
				</div>
				<Input placeholder="Enter email addresses..." className="w-full bg-surface-sunken" />
			</div>
			<div className="flex items-center gap-2">
				<Button variant="pill-active" size="pill" disabled>
					Create
				</Button>
				<Button variant="ghost" size="pill" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
