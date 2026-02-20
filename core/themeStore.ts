import { create } from 'zustand'

import { generateExtendedTokens } from '@/tokens/palettes'
import {
	DEFAULT_CHROMA_SCALE,
	DEFAULT_SCHEME_VARIANT,
	DEFAULT_SEED_HUE,
	type SchemeVariant,
} from '@/tokens/seeds'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

export interface SavedTheme {
	id: string
	name: string
	seedHue: number
	chromaScale: number
	schemeVariant?: SchemeVariant
	createdAt: string
}

interface ThemeState {
	mode: ThemeMode
	resolved: ResolvedTheme
	seedHue: number
	chromaScale: number
	schemeVariant: SchemeVariant
	savedThemes: SavedTheme[]
	activeThemeId: string | null
	setMode: (mode: ThemeMode) => void
	setSeedHue: (hue: number) => void
	setChromaScale: (scale: number) => void
	setSchemeVariant: (variant: SchemeVariant) => void
	saveTheme: (name: string) => void
	deleteTheme: (id: string) => void
	applyTheme: (id: string) => void
	resetToDefault: () => void
	hydrate: () => void
}

const STORAGE_KEY = 'domus-theme'
const STORAGE_SEED = 'domus-theme-seed'
const STORAGE_CHROMA = 'domus-theme-chroma'
const STORAGE_VARIANT = 'domus-theme-variant'
const STORAGE_SAVED = 'domus-theme-saved'
const STORAGE_ACTIVE_ID = 'domus-theme-active-id'

let mediaCleanup: (() => void) | null = null

function setDataTheme(resolved: ResolvedTheme) {
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', resolved)
	}
}

function applyPalette(
	resolved: ResolvedTheme,
	seedHue: number,
	chromaScale: number,
	schemeVariant: SchemeVariant,
) {
	if (typeof document === 'undefined') return
	const tokens = generateExtendedTokens(resolved, { seedHue, chromaScale, schemeVariant })
	const style = document.documentElement.style
	for (const [prop, value] of Object.entries(tokens)) {
		style.setProperty(prop, value)
	}
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

function persistSeed(seedHue: number) {
	if (typeof window !== 'undefined') localStorage.setItem(STORAGE_SEED, String(seedHue))
}

function persistChroma(chromaScale: number) {
	if (typeof window !== 'undefined') localStorage.setItem(STORAGE_CHROMA, String(chromaScale))
}

function persistVariant(variant: SchemeVariant) {
	if (typeof window !== 'undefined') localStorage.setItem(STORAGE_VARIANT, variant)
}

function persistSaved(themes: SavedTheme[]) {
	if (typeof window !== 'undefined') localStorage.setItem(STORAGE_SAVED, JSON.stringify(themes))
}

function persistActiveId(id: string | null) {
	if (typeof window !== 'undefined') {
		if (id) localStorage.setItem(STORAGE_ACTIVE_ID, id)
		else localStorage.removeItem(STORAGE_ACTIVE_ID)
	}
}

export const useThemeStore = create<ThemeState>((set, get) => ({
	mode: 'light',
	resolved: 'light',
	seedHue: DEFAULT_SEED_HUE,
	chromaScale: DEFAULT_CHROMA_SCALE,
	schemeVariant: DEFAULT_SCHEME_VARIANT,
	savedThemes: [],
	activeThemeId: null,

	setMode: (mode) => {
		mediaCleanup?.()
		mediaCleanup = null

		let resolved: ResolvedTheme
		if (mode === 'system') {
			resolved = resolveSystem()
			mediaCleanup = listenSystem((r) => {
				set({ resolved: r })
				setDataTheme(r)
				const { seedHue, chromaScale, schemeVariant } = get()
				applyPalette(r, seedHue, chromaScale, schemeVariant)
			})
		} else {
			resolved = mode
		}

		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, mode)
		}
		setDataTheme(resolved)
		const { seedHue, chromaScale, schemeVariant } = get()
		applyPalette(resolved, seedHue, chromaScale, schemeVariant)
		set({ mode, resolved })
	},

	setSeedHue: (hue) => {
		const clamped = ((hue % 360) + 360) % 360
		persistSeed(clamped)
		set({ seedHue: clamped, activeThemeId: null })
		persistActiveId(null)
		const { resolved, chromaScale, schemeVariant } = get()
		applyPalette(resolved, clamped, chromaScale, schemeVariant)
	},

	setChromaScale: (scale) => {
		const clamped = Math.min(2.0, Math.max(0.5, scale))
		persistChroma(clamped)
		set({ chromaScale: clamped, activeThemeId: null })
		persistActiveId(null)
		const { resolved, seedHue, schemeVariant } = get()
		applyPalette(resolved, seedHue, clamped, schemeVariant)
	},

	setSchemeVariant: (variant) => {
		persistVariant(variant)
		set({ schemeVariant: variant, activeThemeId: null })
		persistActiveId(null)
		const { resolved, seedHue, chromaScale } = get()
		applyPalette(resolved, seedHue, chromaScale, variant)
	},

	saveTheme: (name) => {
		const { seedHue, chromaScale, schemeVariant, savedThemes } = get()
		const theme: SavedTheme = {
			id: crypto.randomUUID(),
			name,
			seedHue,
			chromaScale,
			schemeVariant,
			createdAt: new Date().toISOString(),
		}
		const updated = [...savedThemes, theme]
		set({ savedThemes: updated, activeThemeId: theme.id })
		persistSaved(updated)
		persistActiveId(theme.id)
	},

	deleteTheme: (id) => {
		const { savedThemes, activeThemeId } = get()
		const updated = savedThemes.filter((t) => t.id !== id)
		const newActiveId = activeThemeId === id ? null : activeThemeId
		set({ savedThemes: updated, activeThemeId: newActiveId })
		persistSaved(updated)
		persistActiveId(newActiveId)
	},

	applyTheme: (id) => {
		const { savedThemes, resolved } = get()
		const theme = savedThemes.find((t) => t.id === id)
		if (!theme) return
		const variant = theme.schemeVariant ?? 'tonal'
		set({
			seedHue: theme.seedHue,
			chromaScale: theme.chromaScale,
			schemeVariant: variant,
			activeThemeId: id,
		})
		persistSeed(theme.seedHue)
		persistChroma(theme.chromaScale)
		persistVariant(variant)
		persistActiveId(id)
		applyPalette(resolved, theme.seedHue, theme.chromaScale, variant)
	},

	resetToDefault: () => {
		set({
			seedHue: DEFAULT_SEED_HUE,
			chromaScale: DEFAULT_CHROMA_SCALE,
			schemeVariant: DEFAULT_SCHEME_VARIANT,
			activeThemeId: null,
		})
		persistSeed(DEFAULT_SEED_HUE)
		persistChroma(DEFAULT_CHROMA_SCALE)
		persistVariant(DEFAULT_SCHEME_VARIANT)
		persistActiveId(null)
		const { resolved } = get()
		applyPalette(resolved, DEFAULT_SEED_HUE, DEFAULT_CHROMA_SCALE, DEFAULT_SCHEME_VARIANT)
	},

	hydrate: () => {
		if (typeof window === 'undefined') return

		// Restore mode
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			useThemeStore.getState().setMode(stored)
		}

		// Restore seed hue
		const seedStr = localStorage.getItem(STORAGE_SEED)
		if (seedStr) {
			const parsed = Number.parseFloat(seedStr)
			if (!Number.isNaN(parsed)) set({ seedHue: parsed })
		}

		// Restore chroma scale
		const chromaStr = localStorage.getItem(STORAGE_CHROMA)
		if (chromaStr) {
			const parsed = Number.parseFloat(chromaStr)
			if (!Number.isNaN(parsed)) set({ chromaScale: parsed })
		}

		// Restore scheme variant
		const variantStr = localStorage.getItem(STORAGE_VARIANT)
		if (
			variantStr === 'tonal' ||
			variantStr === 'vibrant' ||
			variantStr === 'muted' ||
			variantStr === 'expressive' ||
			variantStr === 'monochrome'
		) {
			set({ schemeVariant: variantStr })
		}

		// Restore saved themes
		const savedStr = localStorage.getItem(STORAGE_SAVED)
		if (savedStr) {
			try {
				const parsed = JSON.parse(savedStr)
				if (Array.isArray(parsed)) set({ savedThemes: parsed })
			} catch {
				// Corrupted data, ignore
			}
		}

		// Restore active theme id
		const activeId = localStorage.getItem(STORAGE_ACTIVE_ID)
		if (activeId) set({ activeThemeId: activeId })

		// Apply palette with restored values
		const { resolved, seedHue, chromaScale, schemeVariant } = useThemeStore.getState()
		applyPalette(resolved, seedHue, chromaScale, schemeVariant)
	},
}))
