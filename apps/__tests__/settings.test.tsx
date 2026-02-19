import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApp } from '@/apps/settings'
import { useThemeStore } from '@/core/themeStore'
import { DEFAULT_CHROMA_SCALE, DEFAULT_SEED_HUE } from '@/tokens/seeds'

describe('Settings app definition', () => {
	it('has correct type, name, and source', () => {
		expect(settingsApp.type).toBe('settings')
		expect(settingsApp.name).toBe('Settings')
		expect(settingsApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(settingsApp.defaultPresentation).toBe('window')
		expect(settingsApp.defaultSize).toEqual({ width: 320, height: 480 })
	})

	it('is a singleton', () => {
		expect(settingsApp.maxInstances).toBe(1)
	})
})

describe('SettingsApp component', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.setAttribute('data-theme', 'light')
		useThemeStore.setState({
			mode: 'light',
			resolved: 'light',
			seedHue: DEFAULT_SEED_HUE,
			chromaScale: DEFAULT_CHROMA_SCALE,
			savedThemes: [],
			activeThemeId: null,
		})
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

	it('renders card mode when mode=card', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} mode="card" />)
		expect(screen.getByTestId('settings-card')).toBeDefined()
	})

	it('card mode shows current theme label', () => {
		useThemeStore.setState({ mode: 'dark', resolved: 'dark' })
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} mode="card" />)
		expect(screen.getByText('Theme · Dark')).toBeDefined()
	})

	it('renders hue slider', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByTestId('hue-slider')).toBeDefined()
	})

	it('renders vibrancy slider with percentage display', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByText('Vibrancy')).toBeDefined()
		expect(screen.getByText('100%')).toBeDefined()
	})

	it('renders preset hue dots', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByLabelText('Hue 0')).toBeDefined()
		expect(screen.getByLabelText('Hue 264')).toBeDefined()
	})

	it('clicking a preset dot updates seedHue', async () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		await user.click(screen.getByLabelText('Hue 90'))
		expect(useThemeStore.getState().seedHue).toBe(90)
	})

	it('can save a theme and it appears in the list', async () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		const input = screen.getByPlaceholderText('Theme name')
		await user.type(input, 'Ocean')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(screen.getByText('Ocean')).toBeDefined()
		expect(useThemeStore.getState().savedThemes).toHaveLength(1)
		expect(useThemeStore.getState().savedThemes[0].name).toBe('Ocean')
	})

	it('can delete a saved theme', async () => {
		// Pre-populate a saved theme
		useThemeStore.getState().saveTheme('Sunset')
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		expect(screen.getByText('Sunset')).toBeDefined()
		await user.click(screen.getByLabelText('Delete Sunset'))
		expect(useThemeStore.getState().savedThemes).toHaveLength(0)
	})

	it('reset to default restores seedHue and chromaScale', async () => {
		useThemeStore.setState({ seedHue: 120, chromaScale: 1.5 })
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Reset to Default' }))
		expect(useThemeStore.getState().seedHue).toBe(DEFAULT_SEED_HUE)
		expect(useThemeStore.getState().chromaScale).toBe(DEFAULT_CHROMA_SCALE)
	})
})
