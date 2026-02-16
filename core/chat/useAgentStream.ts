export interface SSEEvent {
	type: string
	[key: string]: unknown
}

export function parseSSEEvent(line: string): SSEEvent | null {
	if (!line || line.startsWith(':') || !line.startsWith('data: ')) {
		return null
	}

	const jsonStr = line.slice(6)
	try {
		return JSON.parse(jsonStr)
	} catch {
		return null
	}
}

export async function sendMessage({
	spaceId,
	userId,
	message,
}: {
	spaceId: string
	userId: string
	message: string
}) {
	const response = await fetch('/api/agent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			space_id: spaceId,
			user_id: userId,
			message,
			viewport: {},
			focused_entity_id: null,
			visible_entity_ids: [],
		}),
	})

	if (!response.ok || !response.body) {
		throw new Error(`Agent request failed: ${response.status}`)
	}

	return response.body
}
