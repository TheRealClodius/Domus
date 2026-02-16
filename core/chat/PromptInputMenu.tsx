'use client'

import { FileText, ImageIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { generateThumbnail } from '@/core/chat/imagePreview'
import type { ContextItem } from '@/core/chat/usePromptInputState'
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
	const imageInputRef = useRef<HTMLInputElement>(null)
	const docInputRef = useRef<HTMLInputElement>(null)
	const menuRef = useRef<HTMLDivElement>(null)

	// Click-outside to dismiss
	useEffect(() => {
		function handlePointerDown(e: PointerEvent) {
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

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: ContextItem['type']) {
		const files = Array.from(e.target.files ?? [])
		for (const file of files) {
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
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={SPRING.popIn}
		>
			<input
				ref={imageInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => handleFileChange(e, 'image')}
			/>
			<input
				ref={docInputRef}
				type="file"
				accept=".pdf,.txt,.doc,.docx,.md"
				className="hidden"
				onChange={(e) => handleFileChange(e, 'document')}
			/>

			<MenuCard>
				<MenuCardItem
					title="Upload an image"
					description="Add any images to this Space"
					icon={<ImageIcon size={24} />}
					onClick={() => imageInputRef.current?.click()}
				/>
				<MenuCardItem
					title="Upload a document"
					description="Add files like PDFs, docs, or text"
					icon={<FileText size={24} />}
					onClick={() => docInputRef.current?.click()}
				/>
				<MenuCardItem
					title="Paste from clipboard"
					description="Paste an image or text from your clipboard"
					onClick={handlePasteClipboard}
				/>
			</MenuCard>
		</motion.div>
	)
}
