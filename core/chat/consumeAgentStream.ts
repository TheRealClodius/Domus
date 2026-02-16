import type { AgentSSEEvent } from '@/core/chat/agentStreamTypes'
import { useConversationStore } from '@/core/chat/conversationStore'
import { parseSSEEvent } from '@/core/chat/useAgentStream'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

/** Heuristic: does this result look like an Entity we should upsert? */
function isEntityPayload(result: Record<string, unknown>): result is Entity {
	return (
		typeof result.id === 'string' &&
		typeof result.type === 'string' &&
		typeof result.presentation === 'string'
	)
}

/**
 * Generate a summary from an agent turn's content.
 * Uses the first sentence of text, or describes tool calls if no text.
 */
function deriveSummary(
	text: string,
	toolCalls: { tool: string; result: Record<string, unknown> | null }[],
): string {
	if (text.trim()) {
		const firstSentence = text.trim().split(/[.!?\n]/)[0]
		return firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}...` : firstSentence
	}
	if (toolCalls.length > 0) {
		const names = toolCalls.map((tc) => tc.tool.replace(/_/g, ' ')).join(', ')
		return `Used ${names}`
	}
	return 'Agent responded'
}

/**
 * Read an SSE stream from the agent, dispatch events to conversation + entity stores.
 * Resolves when the stream ends (done/error/close).
 */
export async function consumeAgentStream(stream: ReadableStream<Uint8Array>): Promise<void> {
	const store = useConversationStore.getState()
	store.startAgentTurn()

	const reader = stream.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split('\n\n')
			buffer = lines.pop() ?? ''

			for (const line of lines) {
				const trimmed = line.trim()
				if (!trimmed) continue

				const event = parseSSEEvent(trimmed) as AgentSSEEvent | null
				if (!event) continue

				const s = useConversationStore.getState()

				switch (event.type) {
					case 'text_delta':
						s.appendTextDelta(event.content)
						break

					case 'tool_call_start':
						s.startToolCall(event.id, event.tool)
						break

					case 'tool_call_result': {
						const result = event.result as Record<string, unknown>
						s.resolveToolCall(event.id, result)
						if (isEntityPayload(result)) {
							useEntityStore.getState().upsert(result as Entity)
						}
						break
					}

					case 'done': {
						const current = useConversationStore.getState().currentTurn
						const summary = current
							? deriveSummary(current.text, current.toolCalls)
							: 'Agent responded'
						useConversationStore.getState().completeTurn(summary)
						return
					}

					case 'error':
						s.setError(event.message)
						return
				}
			}
		}

		// Stream ended without a done event — complete anyway
		const current = useConversationStore.getState().currentTurn
		if (current) {
			const summary = deriveSummary(current.text, current.toolCalls)
			useConversationStore.getState().completeTurn(summary)
		}
	} finally {
		reader.releaseLock()
	}
}
