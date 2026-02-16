export interface TextDeltaEvent {
	type: 'text_delta'
	content: string
}

export interface ToolCallStartEvent {
	type: 'tool_call_start'
	tool: string
	id: string
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
}

export type AgentSSEEvent =
	| TextDeltaEvent
	| ToolCallStartEvent
	| ToolCallResultEvent
	| DoneEvent
	| ErrorEvent
