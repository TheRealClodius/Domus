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
import { dbg } from '@/lib/debug'
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
	let hadToolCallSinceLastText = false

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
					case 'text_delta': {
						const prefix =
							hadToolCallSinceLastText && useConversationStore.getState().currentTurn?.text
								? '\n\n'
								: ''
						appendTextDelta(prefix + event.content)
						hadToolCallSinceLastText = false
						break
					}

					// --- New ui_action protocol ---

					case 'ui_action':
						dbg('sse', 'ui_action', { type: event.action, id: event.action_id })
						if (context) {
							handleAction(event.action_id, event.action, event.params, context)
						} else {
							console.warn(
								'[consumeAgentStream] ui_action dropped — no stream context',
								event.action_id,
								event.action,
							)
						}
						hadToolCallSinceLastText = true
						break

					case 'agent_attention':
						useEntityStore.getState().setAgentActive(event.entity_id)
						break

					case 'agent_attention_clear':
						useEntityStore.getState().clearAllAgentActive()
						break

					// --- Legacy tool call protocol (reads, queries, web search, fallback) ---

					case 'tool_call_start':
						dbg('sse', 'tool_call_start', { tool: event.tool, id: event.id })
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
						dbg('sse', 'tool_call_result', { id: event.id })
						const result = event.result as Record<string, unknown>
						resolveToolCall(event.id, result)
						useEntityStore.getState().removePending(event.id)

						// Fallback: only upsert if ui_action didn't already handle this entity.
						// Strip non-Entity fields (e.g. `schema`) before upserting to avoid
						// entitySync attempting to write unknown columns to Supabase.
						if (isEntityPayload(result) && !isHandledByUIAction(result.id as string)) {
							// eslint-disable-next-line @typescript-eslint/no-unused-vars
							const { schema: _schema, ...entityFields } = result
							useEntityStore.getState().upsert(entityFields as Entity)
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
						hadToolCallSinceLastText = true
						break
					}

					case 'done': {
						dbg('sse', 'done')
						useEntityStore.getState().clearAllPending()
						useEntityStore.getState().clearAllAgentActive()
						completeTurn()
						return
					}

					case 'error':
						dbg('sse', 'error', { message: event.message, code: event.code })
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
	} finally {
		reader.releaseLock()
		// Always clean up — covers abort (reader.read() throws AbortError) and
		// any path that exits without an explicit done/error event.
		useEntityStore.getState().clearAllPending()
		useEntityStore.getState().clearAllAgentActive()
		const current = useConversationStore.getState().currentTurn
		if (current) {
			completeTurn()
		}
	}
}
