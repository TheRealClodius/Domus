'use client'

import { FileText, ImageIcon, Plus } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useRef } from 'react'

import type { ContextItem } from '@/core/chat/usePromptInputState'
import { Button } from '@/core/ui/button'
import { MenuCard, MenuCardItem } from '@/core/ui/menu-card'
import { ulid } from '@/lib/id'

const MAX_FILE_SIZE = 5 * 1024 * 1024

function readFilePreview(file: File): Promise<string | undefined> {
	if (!file.type.startsWith('image/')) return Promise.resolve(undefined)
	return new Promise((resolve) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => resolve(undefined)
		reader.readAsDataURL(file)
	})
}

export default function PromptInputMenu({
	open,
	onOpenChange,
	onAddItem,
	onUpdateItem,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onAddItem: (item: ContextItem) => void
	onUpdateItem: (id: string, patch: Partial<ContextItem>) => void
}) {
	const imageInputRef = useRef<HTMLInputElement>(null)
	const docInputRef = useRef<HTMLInputElement>(null)

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

		const preview = await readFilePreview(file)
		onUpdateItem(id, { status: 'ready', preview })
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: ContextItem['type']) {
		const files = Array.from(e.target.files ?? [])
		for (const file of files) {
			processFile(file, type)
		}
		e.target.value = ''
		onOpenChange(false)
	}

	async function handlePasteClipboard() {
		onOpenChange(false)
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
		<>
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

			<PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
				<PopoverPrimitive.Trigger asChild>
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Add attachment"
						className="shrink-0"
					>
						<Plus size={16} />
					</Button>
				</PopoverPrimitive.Trigger>

				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Content side="top" sideOffset={8} className="z-50">
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
					</PopoverPrimitive.Content>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>
		</>
	)
}
