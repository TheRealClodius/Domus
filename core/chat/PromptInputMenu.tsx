'use client'

import { Clipboard } from 'lucide-react'
import { motion, useIsPresent } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { generateThumbnail } from '@/core/chat/imagePreview'
import type { ContextItem } from '@/core/chat/usePromptInputState'
import DocumentStackIcon from '@/core/ui/icons/document-stack'
import GoogleDriveIcon from '@/core/ui/icons/google-drive'
import { MenuCard, MenuCardItem } from '@/core/ui/menu-card'
import { ulid } from '@/lib/id'
import { SPRING } from '@/lib/motion'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function PromptInputMenu({
	onClose,
	onAddItem,
	onUpdateItem,
}: {
	onClose: () => void
	onAddItem: (item: ContextItem) => void
	onUpdateItem: (id: string, patch: Partial<ContextItem>) => void
}) {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)
	const isPresent = useIsPresent()
	const [iconsFanned, setIconsFanned] = useState(false)

	// Fan on mount, unfan on AnimatePresence exit
	useEffect(() => {
		if (isPresent) {
			const timer = setTimeout(() => setIconsFanned(true), 0)
			return () => clearTimeout(timer)
		}
		setIconsFanned(false)
	}, [isPresent])

	// Click-outside to dismiss (skip the toggle button — it handles its own open/close)
	useEffect(() => {
		function handlePointerDown(e: PointerEvent) {
			if ((e.target as Element).closest?.('[data-menu-toggle]')) return
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose()
			}
		}
		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [onClose])

	// Escape to dismiss
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onClose])

	async function processFile(file: File, type: ContextItem['type']) {
		if (file.size > MAX_FILE_SIZE) {
			onAddItem({
				id: ulid(),
				file,
				name: file.name,
				type,
				status: 'error',
				error: 'File too large (max 5MB)',
			})
			return
		}

		const id = ulid()
		onAddItem({ id, file, name: file.name, type, status: 'loading' })

		const preview = await generateThumbnail(file)
		onUpdateItem(id, { status: 'ready', preview })
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		for (const file of files) {
			const type = file.type.startsWith('image/') ? 'image' : 'document'
			processFile(file, type)
		}
		e.target.value = ''
		onClose()
	}

	async function handlePasteClipboard() {
		onClose()
		try {
			const items = await navigator.clipboard.read()
			for (const item of items) {
				const imageType = item.types.find((t) => t.startsWith('image/'))
				if (imageType) {
					const blob = await item.getType(imageType)
					const file = new File([blob], 'clipboard-image.png', { type: imageType })
					processFile(file, 'clipboard')
					return
				}
				if (item.types.includes('text/plain')) {
					const blob = await item.getType('text/plain')
					const text = await blob.text()
					if (text.trim()) {
						onAddItem({
							id: ulid(),
							file: new File([text], 'clipboard-text.txt', { type: 'text/plain' }),
							name: 'Clipboard text',
							type: 'clipboard',
							status: 'ready',
						})
					}
					return
				}
			}
		} catch {
			// Clipboard API not available or permission denied — silently fail
		}
	}

	return (
		<motion.div
			ref={menuRef}
			initial={{ opacity: 0, scale: 0.97, y: 24 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97, y: 8 }}
			transition={isPresent ? SPRING.popIn : { ...SPRING.popIn, delay: 0.15 }}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*,.pdf,.txt,.doc,.docx,.md"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>

			<MenuCard className="min-w-[440px]">
				<MenuCardItem
					title="Upload from your computer"
					description="Add any images or files to this Space"
					icon={<DocumentStackIcon fanned={iconsFanned} />}
					onClick={() => fileInputRef.current?.click()}
				/>
				<MenuCardItem
					title="Import from Drive"
					description="Import files from Drive & pin them to this Space."
					icon={<GoogleDriveIcon />}
					tag="coming soon"
					disabled
					onClick={() => {
						// TODO: Google Drive integration
						onClose()
					}}
				/>
				<MenuCardItem
					title="Paste from clipboard"
					description="Paste an image or text from your clipboard"
					icon={
						<div className="flex items-center justify-center" style={{ width: 75, height: 75 }}>
							<Clipboard size={40} strokeWidth={1.5} className="text-on-surface-muted" />
						</div>
					}
					onClick={handlePasteClipboard}
				/>
			</MenuCard>
		</motion.div>
	)
}
