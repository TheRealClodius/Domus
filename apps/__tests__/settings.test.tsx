import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApp } from '@/apps/settings'
import { useThemeStore } from '@/core/themeStore'

describe('Settings app definition', () => {
	it('has correct type, name, and source', () => {
		expect(settingsApp.type).toBe('settings')
		expect(settingsApp.name).toBe('Settings')
		expect(settingsApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(settingsApp.defaultPresentation).toBe('window')
		expect(settingsApp.defaultSize).toEqual({ width: 280, height: 200 })
	})

	it('is a singleton', () => {
		expect(settingsApp.maxInstances).toBe(1)
	})
})

describe('SettingsApp component', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.setAttribute('data-theme', 'light')
		useThemeStore.setState({ mode: 'light', resolved: 'light' })
	})

	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	it('renders three theme options', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByRole('button', { name: 'Light' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Dark' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'System' })).toBeDefined()
	})

	it('highlights the active mode', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const lightBtn = screen.getByRole('button', { name: 'Light' })
		expect(lightBtn.getAttribute('data-variant')).toBe('pill-active')
	})

	it('clicking Dark calls setMode and updates highlight', async () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Dark' }))
		expect(useThemeStore.getState().mode).toBe('dark')
	})
})
