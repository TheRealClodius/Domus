import type { AgentSSEEvent } from '@/core/chat/agentStreamTypes'
import { useConversationStore } from '@/core/chat/conversationStore'
import { parseSSEEvent } from '@/core/chat/useAgentStream'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

/** Map raw agent/API errors to user-friendly messages. */
export function friendlyError(raw: string): string {
	const lower = raw.toLowerCase()
	if (lower.includes('quota_exhausted')) return "You've used all your agent turns for this period."
	if (lower.includes('rate_limited')) return 'Too many requests — please wait a moment.'
	if (lower.includes('overloaded'))
		return 'The AI is temporarily overloaded — try again in a moment.'
	if (lower.includes('rate_limit') || lower.includes('rate limit'))
		return 'Rate limit reached — please wait a moment before trying again.'
	if (lower.includes('authentication_error') || lower.includes('invalid api key'))
		return 'Authentication error with the AI service.'
	if (lower.includes('agent request failed'))
		return 'Could not reach the agent — check your connection and try again.'
	return raw
}

/** Heuristic: does this result look like an Entity we should upsert? */
function isEntityPayload(result: Record<string, unknown>): result is Entity {
	return (
		typeof result.id === 'string' &&
		typeof result.type === 'string' &&
		typeof result.presentation === 'string' &&
		typeof result.space_id === 'string' &&
		typeof result.position === 'object' &&
		result.position !== null &&
		typeof result.size === 'object' &&
		result.size !== null
	)
}

export interface StreamContext {
	spaceId: string
	userId: string
	viewport: { width: number; height: number }
}

const CARD_W = 232
const CARD_H = 300
const GAP = 16
const GRID_COLS = 5

function buildPendingEntity(
	args: Record<string, unknown>,
	context: StreamContext,
	index = 0,
): Entity {
	const col = index % GRID_COLS
	const row = Math.floor(index / GRID_COLS)
	// Tile from canvas center; col 2 is the middle column
	const cx = context.viewport.width / 2 - CARD_W / 2
	const cy = context.viewport.height / 2 - CARD_H / 2
	const position = {
		x: Math.round(cx + (col - 2) * (CARD_W + GAP)),
		y: Math.round(cy + row * (CARD_H + GAP)),
		locked: false,
	}

	return {
		id: '', // will be overwritten by addPending
		space_id: context.spaceId,
		user_id: context.userId,
		type: (args.type as string) || 'note',
		presentation: 'card',
		position,
		size: { width: 232, height: 300 },
		z_index: 1,
		content: '',
		state: {
			_pending: true,
			generation_prompt: args.generation_prompt,
			summary: args.summary,
		},
		summary: (args.summary as string) || 'Generating...',
		created_by: 'agent',
		archived: false,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
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
		const match = text.trim().match(/^(.+?[.!?])(?:\s|$)/)
		const firstSentence = match ? match[1] : text.trim()
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
export async function consumeAgentStream(
	stream: ReadableStream<Uint8Array>,
	signal?: AbortSignal,
	context?: StreamContext,
): Promise<void> {
	const {
		startAgentTurn,
		appendTextDelta,
		startToolCall,
		resolveToolCall,
		completeTurn,
		setError,
	} = useConversationStore.getState()
	startAgentTurn()

	const reader = stream.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	let pendingIndex = 0

	try {
		while (true) {
			if (signal?.aborted) break

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

				switch (event.type) {
					case 'text_delta':
						appendTextDelta(event.content)
						break

					case 'tool_call_start':
						startToolCall(event.id, event.tool, event.args)
						if (context && event.tool === 'create_entity' && event.args) {
							const pending = buildPendingEntity(event.args, context, pendingIndex++)
							useEntityStore.getState().addPending(event.id, pending)
						}
						break

					case 'tool_call_result': {
						const result = event.result as Record<string, unknown>
						resolveToolCall(event.id, result)
						useEntityStore.getState().removePending(event.id)
						if (isEntityPayload(result)) {
							useEntityStore.getState().upsert(result as Entity)
						}
						break
					}

					case 'done': {
						useEntityStore.getState().clearAllPending()
						const current = useConversationStore.getState().currentTurn
						const summary = current
							? deriveSummary(current.text, current.toolCalls)
							: 'Agent responded'
						completeTurn(summary)
						return
					}

					case 'error':
						useEntityStore.getState().clearAllPending()
						setError(friendlyError(event.message), {
							code: event.code,
							resets_at: event.resets_at,
							retry_after: event.retry_after,
						})
						return
				}
			}
		}

		// Stream ended without a done event — complete anyway
		useEntityStore.getState().clearAllPending()
		const current = useConversationStore.getState().currentTurn
		if (current) {
			const summary = signal?.aborted ? 'Cancelled' : deriveSummary(current.text, current.toolCalls)
			completeTurn(summary)
		}
	} finally {
		reader.releaseLock()
	}
}
