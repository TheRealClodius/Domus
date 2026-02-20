import { create } from 'zustand'

export type SheetContentType = 'entity' | 'login' | 'image' | 'profile'

interface SheetState {
	isOpen: boolean
	entityId: string | null
	contentType: SheetContentType | null
	sectionId: string | null
	agentStreaming: boolean
	streamPaused: boolean
	agentCursorPosition: number | null
	_onCloseComplete: (() => void) | null
	open: (entityId: string | null, contentType: SheetContentType, sectionId?: string) => void
	close: (onComplete?: () => void) => void
	fireCloseComplete: () => void
	startStreaming: () => void
	stopStreaming: () => void
	pauseStreaming: () => void
	resumeStreaming: () => void
	setAgentCursorPosition: (pos: number | null) => void
}

export const useSheetStore = create<SheetState>((set) => ({
	isOpen: false,
	entityId: null,
	contentType: null,
	sectionId: null,
	agentStreaming: false,
	streamPaused: false,
	agentCursorPosition: null,
	_onCloseComplete: null,

	open: (entityId, contentType, sectionId) => {
		set({ isOpen: true, entityId, contentType, sectionId: sectionId ?? null })
	},

	close: (onComplete) => {
		set({
			isOpen: false,
			entityId: null,
			contentType: null,
			sectionId: null,
			agentStreaming: false,
			streamPaused: false,
			agentCursorPosition: null,
			_onCloseComplete: onComplete ?? null,
		})
	},

	fireCloseComplete: () => {
		const cb = useSheetStore.getState()._onCloseComplete
		if (cb) {
			set({ _onCloseComplete: null })
			cb()
		}
	},

	startStreaming: () => set({ agentStreaming: true, streamPaused: false }),
	stopStreaming: () =>
		set({ agentStreaming: false, streamPaused: false, agentCursorPosition: null }),
	pauseStreaming: () => set({ streamPaused: true }),
	resumeStreaming: () => set({ streamPaused: false }),
	setAgentCursorPosition: (pos) => set({ agentCursorPosition: pos }),
}))
