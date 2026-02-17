import { create } from 'zustand'

export interface ToolCallEntry {
	id: string
	tool: string
	status: 'pending' | 'done'
	result: Record<string, unknown> | null
	args?: Record<string, unknown>
}

export interface ConversationTurn {
	id: string
	role: 'user' | 'agent'
	text: string
	toolCalls: ToolCallEntry[]
	summary?: string
}

export interface ConversationState {
	turns: ConversationTurn[]
	currentTurn: Omit<ConversationTurn, 'summary'> | null
	error: string | null
	panelVisible: boolean

	addUserTurn: (text: string) => void
	startAgentTurn: () => void
	appendTextDelta: (content: string) => void
	startToolCall: (id: string, tool: string, args?: Record<string, unknown>) => void
	resolveToolCall: (id: string, result: Record<string, unknown>) => void
	completeTurn: (summary: string) => void
	setError: (message: string) => void
	dismissPanel: () => void
	reset: () => void
}

export function selectStatus(s: ConversationState): 'idle' | 'streaming' | 'error' {
	if (s.error) return 'error'
	if (s.currentTurn) return 'streaming'
	return 'idle'
}

export const useConversationStore = create<ConversationState>((set, get) => ({
	turns: [],
	currentTurn: null,
	error: null,
	panelVisible: false,

	addUserTurn: (text) => {
		const id = crypto.randomUUID()
		set((s) => ({
			turns: [...s.turns, { id, role: 'user', text, toolCalls: [] }],
			panelVisible: true,
		}))
	},

	startAgentTurn: () => {
		const id = crypto.randomUUID()
		set({
			currentTurn: { id, role: 'agent', text: '', toolCalls: [] },
			error: null,
		})
	},

	appendTextDelta: (content) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		set({ currentTurn: { ...currentTurn, text: currentTurn.text + content } })
	},

	startToolCall: (id, tool, args) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		set({
			currentTurn: {
				...currentTurn,
				toolCalls: [...currentTurn.toolCalls, { id, tool, status: 'pending', result: null, args }],
			},
		})
	},

	resolveToolCall: (id, result) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		set({
			currentTurn: {
				...currentTurn,
				toolCalls: currentTurn.toolCalls.map((tc) =>
					tc.id === id ? { ...tc, status: 'done' as const, result } : tc,
				),
			},
		})
	},

	completeTurn: (summary) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		const completedTurn: ConversationTurn = { ...currentTurn, summary }
		set((s) => ({
			turns: [...s.turns, completedTurn],
			currentTurn: null,
		}))
	},

	setError: (message) => {
		const { currentTurn } = get()
		if (currentTurn) {
			// Preserve partial turn so user sees what was streamed
			const partialTurn: ConversationTurn = {
				...currentTurn,
				summary: 'Error during response',
			}
			set((s) => ({
				turns: [...s.turns, partialTurn],
				currentTurn: null,
				error: message,
			}))
		} else {
			set({ error: message })
		}
	},

	dismissPanel: () => {
		set({ panelVisible: false })
	},

	reset: () => {
		set({ turns: [], currentTurn: null, error: null, panelVisible: false })
	},
}))
