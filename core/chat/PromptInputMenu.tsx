'use client'

import { FileText, ImageIcon, Plus } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { useRef } from 'react'

import type { ContextItem } from '@/core/chat/usePromptInputState'
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
					<button
						type="button"
						aria-label="Add attachment"
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-muted transition-colors hover:bg-surface-glass-heavy hover:text-on-surface"
					>
						<Plus size={16} />
					</button>
				</PopoverPrimitive.Trigger>

				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Content
						side="top"
						sideOffset={8}
						className="z-50 min-w-[180px] rounded-md bg-surface-glass-heavy shadow-overlay backdrop-blur-[var(--blur-medium)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
					>
						<button
							type="button"
							className="flex w-full items-center gap-2 px-3 py-2 text-body text-on-surface transition-colors hover:bg-surface-glass"
							onClick={() => imageInputRef.current?.click()}
						>
							<ImageIcon size={16} />
							Upload an image
						</button>
						<button
							type="button"
							className="flex w-full items-center gap-2 px-3 py-2 text-body text-on-surface transition-colors hover:bg-surface-glass"
							onClick={() => docInputRef.current?.click()}
						>
							<FileText size={16} />
							Upload a document
						</button>
						<button
							type="button"
							className="flex w-full items-center gap-2 px-3 py-2 text-body text-on-surface transition-colors hover:bg-surface-glass"
							onClick={handlePasteClipboard}
						>
							<Plus size={16} />
							Paste from clipboard
						</button>
					</PopoverPrimitive.Content>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>
		</>
	)
}
