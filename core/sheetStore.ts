import { create } from 'zustand'

export type SheetContentType = 'entity' | 'login' | 'image'

interface SheetState {
	isOpen: boolean
	entityId: string | null
	contentType: SheetContentType | null
	open: (entityId: string | null, contentType: SheetContentType) => void
	close: () => void
}

export const useSheetStore = create<SheetState>((set) => ({
	isOpen: false,
	entityId: null,
	contentType: null,

	open: (entityId, contentType) => {
		set({ isOpen: true, entityId, contentType })
	},

	close: () => {
		set({ isOpen: false, entityId: null, contentType: null })
	},
}))
