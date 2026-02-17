import type { AgentSSEEvent } from '@/core/chat/agentStreamTypes'
import type { ContextItem } from '@/core/chat/usePromptInputState'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_TOTAL_PAYLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

export function parseSSEEvent(line: string): AgentSSEEvent | null {
	if (!line || line.startsWith(':') || !line.startsWith('data: ')) {
		return null
	}

	const jsonStr = line.slice(6)
	try {
		return JSON.parse(jsonStr)
	} catch (err) {
		console.warn('[SSE] Failed to parse event:', jsonStr, err)
		return null
	}
}

/** Convert a File object to a base64 data URL string. */
export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

export interface SerializedContextItem {
	id: string
	name: string
	type: ContextItem['type']
	data: string
}

/** Filter to ready items and convert File attachments to base64 for transport. */
export async function serializeContextItems(
	items: ContextItem[],
): Promise<SerializedContextItem[]> {
	const ready = items.filter(
		(item) => item.status === 'ready' && item.file.size <= MAX_FILE_SIZE_BYTES,
	)
	const result = await Promise.all(
		ready.map(async (item) => ({
			id: item.id,
			name: item.name,
			type: item.type,
			data: await fileToBase64(item.file),
		})),
	)
	if (JSON.stringify(result).length > MAX_TOTAL_PAYLOAD_BYTES) {
		throw new Error('Total payload exceeds 25 MB limit')
	}
	return result
}

export async function sendMessage({
	spaceId,
	userId,
	message,
	signal,
	viewport = {},
	focusedEntityId = null,
	visibleEntityIds = [],
	contextItems = [],
}: {
	spaceId: string
	userId: string
	message: string
	signal?: AbortSignal
	viewport?: { width: number; height: number } | Record<string, never>
	focusedEntityId?: string | null
	visibleEntityIds?: string[]
	contextItems?: SerializedContextItem[]
}) {
	const response = await fetch('/api/agent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			space_id: spaceId,
			user_id: userId,
			message,
			viewport,
			focused_entity_id: focusedEntityId,
			visible_entity_ids: visibleEntityIds,
			context_items: contextItems,
		}),
		signal,
	})

	if (!response.ok || !response.body) {
		throw new Error(`Agent request failed: ${response.status}`)
	}

	return response.body
}
