'use client'

import { Camera, UserPlus, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/core/ui/button'
import { Input } from '@/core/ui/input'

interface ChatGroupModalProps {
	mode: 'join' | 'create'
	onClose: () => void
	onJoin: (code: string) => Promise<void>
	onCreate: (name: string, avatar?: File) => Promise<void>
}

export default function ChatGroupModal({ mode, onClose, onJoin, onCreate }: ChatGroupModalProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onClose])

	if (mode === 'join') return <JoinContent onClose={onClose} onJoin={onJoin} />
	return <CreateContent onClose={onClose} onCreate={onCreate} />
}

function CloseButton({ onClick }: { onClick: () => void }) {
	return (
		<div className="absolute top-4 left-4">
			<Button variant="pill-secondary" size="pill" onClick={onClick} aria-label="Close">
				<X className="size-3.5" />
			</Button>
		</div>
	)
}

function JoinContent({
	onClose,
	onJoin,
}: {
	onClose: () => void
	onJoin: (code: string) => Promise<void>
}) {
	const [code, setCode] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleJoin = async () => {
		if (!code.trim()) return
		setIsLoading(true)
		setError(null)
		try {
			await onJoin(code.trim())
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to join group')
		} finally {
			setIsLoading(false)
		}
	}

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
			<Input
				value={code}
				onChange={(e) => setCode(e.target.value)}
				placeholder="Invite code"
				className="max-w-xs w-full bg-surface-lowest mb-4"
				onKeyDown={(e) => {
					if (e.key === 'Enter') handleJoin()
				}}
			/>
			{error && <p className="text-label text-error mb-2">{error}</p>}
			<div className="flex items-center gap-2">
				<Button
					variant="pill-active"
					size="pill"
					disabled={!code.trim() || isLoading}
					onClick={handleJoin}
				>
					{isLoading ? 'Joining...' : 'Join'}
				</Button>
				<Button variant="ghost" size="pill" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	)
}

function CreateContent({
	onClose,
	onCreate,
}: {
	onClose: () => void
	onCreate: (name: string, avatar?: File) => Promise<void>
}) {
	const [name, setName] = useState('')
	const [avatarFile, setAvatarFile] = useState<File | null>(null)
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setAvatarFile(file)
		const url = URL.createObjectURL(file)
		setAvatarPreview(url)
	}

	useEffect(() => {
		return () => {
			if (avatarPreview) URL.revokeObjectURL(avatarPreview)
		}
	}, [avatarPreview])

	const handleCreate = async () => {
		if (!name.trim()) return
		setIsLoading(true)
		setError(null)
		try {
			await onCreate(name.trim(), avatarFile ?? undefined)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to create group')
			setIsLoading(false)
		}
	}

	return (
		<div className="h-full bg-surface flex flex-col items-center justify-center p-6 relative">
			<CloseButton onClick={onClose} />
			{/* Avatar picker */}
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				className="size-20 rounded-full bg-surface-lowest overflow-hidden flex items-center justify-center mb-5 hover:bg-on-surface/8 transition-colors"
			>
				{avatarPreview ? (
					<Image
						src={avatarPreview}
						alt="Group avatar"
						width={80}
						height={80}
						className="size-full object-cover"
						unoptimized
					/>
				) : (
					<Camera className="size-6 text-on-surface-muted" />
				)}
			</button>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleAvatarPick}
			/>
			<h2 className="text-heading text-on-surface mb-4">Create a new group</h2>
			<Input
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Group name"
				className="max-w-xs w-full bg-surface-lowest mb-6"
				onKeyDown={(e) => {
					if (e.key === 'Enter') handleCreate()
				}}
			/>
			<p className="text-body-sm text-on-surface-muted text-center max-w-xs mb-6">
				You can find the invite code in the group settings after creating.
			</p>
			{error && <p className="text-label text-error mb-2">{error}</p>}
			<div className="flex items-center gap-2">
				<Button
					variant="pill-active"
					size="pill"
					disabled={!name.trim() || isLoading}
					onClick={handleCreate}
				>
					{isLoading ? 'Creating...' : 'Create'}
				</Button>
				<Button variant="ghost" size="pill" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
