import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@/core/themeStore'

// Mock matchMedia
function mockMatchMedia(matches: boolean) {
	const listeners: Array<(e: { matches: boolean }) => void> = []
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue({
			matches,
			addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
			removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
				const i = listeners.indexOf(cb)
				if (i >= 0) listeners.splice(i, 1)
			},
		}),
	})
	return {
		fire: (m: boolean) => {
			for (const cb of listeners) cb({ matches: m })
		},
	}
}

describe('themeStore', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.setAttribute('data-theme', 'light')
		useThemeStore.setState({ mode: 'light', resolved: 'light' })
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('defaults to light mode', () => {
		const { mode, resolved } = useThemeStore.getState()
		expect(mode).toBe('light')
		expect(resolved).toBe('light')
	})

	it('setMode("dark") updates mode, resolved, localStorage, and data-theme', () => {
		useThemeStore.getState().setMode('dark')
		const { mode, resolved } = useThemeStore.getState()
		expect(mode).toBe('dark')
		expect(resolved).toBe('dark')
		expect(localStorage.getItem('domus-theme')).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
	})

	it('setMode("light") switches back', () => {
		useThemeStore.getState().setMode('dark')
		useThemeStore.getState().setMode('light')
		expect(useThemeStore.getState().resolved).toBe('light')
		expect(document.documentElement.getAttribute('data-theme')).toBe('light')
	})

	it('setMode("system") resolves from matchMedia', () => {
		mockMatchMedia(true) // prefers dark
		useThemeStore.getState().setMode('system')
		expect(useThemeStore.getState().mode).toBe('system')
		expect(useThemeStore.getState().resolved).toBe('dark')
		expect(localStorage.getItem('domus-theme')).toBe('system')
	})

	it('system mode reacts to matchMedia changes', () => {
		const { fire } = mockMatchMedia(false)
		useThemeStore.getState().setMode('system')
		expect(useThemeStore.getState().resolved).toBe('light')

		fire(true)
		expect(useThemeStore.getState().resolved).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
	})

	it('switching away from system stops listening to matchMedia', () => {
		const { fire } = mockMatchMedia(false)
		useThemeStore.getState().setMode('system')
		useThemeStore.getState().setMode('light')

		fire(true) // should be ignored
		expect(useThemeStore.getState().resolved).toBe('light')
	})

	it('hydrate reads from localStorage', () => {
		localStorage.setItem('domus-theme', 'dark')
		useThemeStore.getState().hydrate()
		expect(useThemeStore.getState().mode).toBe('dark')
		expect(useThemeStore.getState().resolved).toBe('dark')
	})
})
