import { create } from 'zustand'

export interface ToolCallEntry {
	id: string
	tool: string
	status: 'pending' | 'done'
	result: Record<string, unknown> | null
}

export interface ConversationTurn {
	id: string
	role: 'user' | 'agent'
	text: string
	toolCalls: ToolCallEntry[]
	summary?: string
}

interface ConversationState {
	turns: ConversationTurn[]
	currentTurn: Omit<ConversationTurn, 'summary'> | null
	status: 'idle' | 'streaming' | 'error'
	error: string | null
	panelVisible: boolean

	addUserTurn: (text: string) => void
	startAgentTurn: () => void
	appendTextDelta: (content: string) => void
	startToolCall: (id: string, tool: string) => void
	resolveToolCall: (id: string, result: Record<string, unknown>) => void
	completeTurn: (summary: string) => void
	setError: (message: string) => void
	dismissPanel: () => void
	reset: () => void
}

let turnCounter = 0

export const useConversationStore = create<ConversationState>((set, get) => ({
	turns: [],
	currentTurn: null,
	status: 'idle',
	error: null,
	panelVisible: false,

	addUserTurn: (text) => {
		const id = `turn-${++turnCounter}`
		set((s) => ({
			turns: [...s.turns, { id, role: 'user', text, toolCalls: [] }],
			panelVisible: true,
		}))
	},

	startAgentTurn: () => {
		const id = `turn-${++turnCounter}`
		set({
			currentTurn: { id, role: 'agent', text: '', toolCalls: [] },
			status: 'streaming',
			error: null,
		})
	},

	appendTextDelta: (content) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		set({ currentTurn: { ...currentTurn, text: currentTurn.text + content } })
	},

	startToolCall: (id, tool) => {
		const { currentTurn } = get()
		if (!currentTurn) return
		set({
			currentTurn: {
				...currentTurn,
				toolCalls: [...currentTurn.toolCalls, { id, tool, status: 'pending', result: null }],
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
			status: 'idle',
		}))
	},

	setError: (message) => {
		set({ status: 'error', error: message })
	},

	dismissPanel: () => {
		set({ panelVisible: false })
	},

	reset: () => {
		turnCounter = 0
		set({ turns: [], currentTurn: null, status: 'idle', error: null, panelVisible: false })
	},
}))
