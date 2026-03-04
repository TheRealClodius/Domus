import type { StreamContext } from '@/core/chat/agentActionInterpreter'
import {
	buildPendingEntity,
	handleAction,
	isEntityPayload,
	isHandledByUIAction,
	nextPendingIndex,
	resetTurnState,
} from '@/core/chat/agentActionInterpreter'
import type { AgentSSEEvent } from '@/core/chat/agentStreamTypes'
import { useConversationStore } from '@/core/chat/conversationStore'
import { parseSSEEvent } from '@/core/chat/useAgentStream'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

export type { StreamContext }

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
 *
 * Handles two event protocols:
 * - `ui_action` / `agent_attention` / `agent_attention_clear`: new protocol where
 *   the frontend is the sole entity writer. Routed to agentActionInterpreter.
 * - `tool_call_start` / `tool_call_result`: legacy protocol for non-mirrored
 *   operations (reads, web search, queries) and fallback direct writes.
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
	resetTurnState()

	const reader = stream.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

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

					// --- New ui_action protocol ---

					case 'ui_action':
						if (context) {
							handleAction(event.action_id, event.action, event.params, context)
						}
						break

					case 'agent_attention':
						useEntityStore.getState().setAgentActive(event.entity_id)
						break

					case 'agent_attention_clear':
						useEntityStore.getState().clearAllAgentActive()
						break

					// --- Legacy tool call protocol (reads, queries, web search, fallback) ---

					case 'tool_call_start':
						startToolCall(event.id, event.tool, event.args)
						if (context && event.tool === 'create_entity' && event.args) {
							const pending = buildPendingEntity(event.args, context, nextPendingIndex())
							useEntityStore.getState().addPending(event.id, pending)
						}
						if (
							(event.tool === 'read_entity' || event.tool === 'update_entity') &&
							typeof event.args?.id === 'string'
						) {
							useEntityStore.getState().setAgentActive(event.args.id)
						}
						break

					case 'tool_call_result': {
						const result = event.result as Record<string, unknown>
						resolveToolCall(event.id, result)
						useEntityStore.getState().removePending(event.id)

						// Fallback: only upsert if ui_action didn't already handle this entity
						if (isEntityPayload(result) && !isHandledByUIAction(result.id as string)) {
							useEntityStore.getState().upsert(result as Entity)
						}

						// Clear attention for single-entity tools
						const tc = useConversationStore
							.getState()
							.currentTurn?.toolCalls.find((t) => t.id === event.id)
						if (tc?.args?.id && typeof tc.args.id === 'string') {
							useEntityStore.getState().clearAgentActive(tc.args.id)
						}
						// Flash query results briefly
						if (tc?.tool === 'query_entities') {
							const ids = (result.entity_ids ?? []) as string[]
							for (const id of ids) useEntityStore.getState().setAgentActive(id)
							setTimeout(() => {
								for (const id of ids) useEntityStore.getState().clearAgentActive(id)
							}, 1500)
						}
						break
					}

					case 'done': {
						useEntityStore.getState().clearAllPending()
						useEntityStore.getState().clearAllAgentActive()
						const current = useConversationStore.getState().currentTurn
						const summary = current
							? deriveSummary(current.text, current.toolCalls)
							: 'Agent responded'
						completeTurn(summary)
						return
					}

					case 'error':
						useEntityStore.getState().clearAllPending()
						useEntityStore.getState().clearAllAgentActive()
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
		useEntityStore.getState().clearAllAgentActive()
		const current = useConversationStore.getState().currentTurn
		if (current) {
			const summary = signal?.aborted ? 'Cancelled' : deriveSummary(current.text, current.toolCalls)
			completeTurn(summary)
		}
	} finally {
		reader.releaseLock()
	}
}
