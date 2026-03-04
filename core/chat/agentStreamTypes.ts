export interface TextDeltaEvent {
	type: 'text_delta'
	content: string
}

export interface ToolCallStartEvent {
	type: 'tool_call_start'
	tool: string
	id: string
	args?: Record<string, unknown>
}

export interface ToolCallResultEvent {
	type: 'tool_call_result'
	id: string
	result: Record<string, unknown>
}

export interface DoneEvent {
	type: 'done'
}

export interface ErrorEvent {
	type: 'error'
	message: string
	code?: string
	resets_at?: string
	retry_after?: number
}

export interface UIActionEvent {
	type: 'ui_action'
	action_id: string
	action: string
	params: Record<string, unknown>
}

export interface AgentAttentionEvent {
	type: 'agent_attention'
	entity_id: string
	intent: 'reading' | 'editing'
}

export interface AgentAttentionClearEvent {
	type: 'agent_attention_clear'
}

export type AgentSSEEvent =
	| TextDeltaEvent
	| ToolCallStartEvent
	| ToolCallResultEvent
	| DoneEvent
	| ErrorEvent
	| UIActionEvent
	| AgentAttentionEvent
	| AgentAttentionClearEvent
