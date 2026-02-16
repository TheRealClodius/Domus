import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
	mode: ThemeMode
	resolved: ResolvedTheme
	setMode: (mode: ThemeMode) => void
	hydrate: () => void
}

const STORAGE_KEY = 'domus-theme'

let mediaCleanup: (() => void) | null = null

function applyTheme(resolved: ResolvedTheme) {
	document.documentElement.setAttribute('data-theme', resolved)
}

function resolveSystem(): ResolvedTheme {
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function listenSystem(onChange: (resolved: ResolvedTheme) => void) {
	const mql = window.matchMedia('(prefers-color-scheme: dark)')
	const handler = (e: { matches: boolean }) => {
		onChange(e.matches ? 'dark' : 'light')
	}
	mql.addEventListener('change', handler)
	return () => mql.removeEventListener('change', handler)
}

export const useThemeStore = create<ThemeState>((set) => ({
	mode: 'light',
	resolved: 'light',

	setMode: (mode) => {
		// Clean up previous system listener
		mediaCleanup?.()
		mediaCleanup = null

		let resolved: ResolvedTheme
		if (mode === 'system') {
			resolved = resolveSystem()
			mediaCleanup = listenSystem((r) => {
				set({ resolved: r })
				applyTheme(r)
			})
		} else {
			resolved = mode
		}

		localStorage.setItem(STORAGE_KEY, mode)
		applyTheme(resolved)
		set({ mode, resolved })
	},

	hydrate: () => {
		const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
		if (stored) {
			useThemeStore.getState().setMode(stored)
		}
	},
}))
