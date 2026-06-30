import { create } from 'zustand'
import { generateThumbnail } from '@/core/agent-chat/imagePreview'
import type { ContextItem } from '@/core/agent-chat/usePromptInputState'
import { ulid } from '@/lib/id'
import type { Entity } from '@/lib/types'

interface ChatContextBridge {
	addContextItem: ((item: ContextItem) => void) | null
	updateContextItem: ((id: string, patch: Partial<ContextItem>) => void) | null
	register: (
		add: (item: ContextItem) => void,
		update: (id: string, patch: Partial<ContextItem>) => void,
	) => void
	addEntityToChat: (entity: Entity) => Promise<void>
}

function getImageUrl(entity: Entity): string | null {
	if (entity.type !== 'image') return null
	const url = (entity.state?.image_url ?? entity.state?.src) as string | undefined
	return url || null
}

async function fetchImageAsFile(url: string): Promise<File> {
	const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
	if (!res.ok) {
		throw new Error(`Failed to fetch image: ${res.status}`)
	}
	const blob = await res.blob()
	const ext = blob.type.split('/')[1] ?? 'png'
	return new File([blob], `entity-image.${ext}`, { type: blob.type })
}

export const useChatContextBridge = create<ChatContextBridge>((set, get) => ({
	addContextItem: null,
	updateContextItem: null,

	register: (add, update) => set({ addContextItem: add, updateContextItem: update }),

	addEntityToChat: async (entity) => {
		const { addContextItem, updateContextItem } = get()
		if (!addContextItem || !updateContextItem) return

		const imageUrl = getImageUrl(entity)
		if (!imageUrl) return // TODO: support non-image entities

		const id = ulid()

		try {
			const file = await fetchImageAsFile(imageUrl)
			addContextItem({ id, file, name: file.name, type: 'image', status: 'loading' })
			const preview = await generateThumbnail(file)
			updateContextItem(id, { status: 'ready', preview })
		} catch (err) {
			addContextItem({
				id,
				file: new File([], 'error'),
				name: 'entity-image',
				type: 'image',
				status: 'error',
				error: err instanceof Error ? err.message : 'Failed to load image',
			})
		}
	},
}))
