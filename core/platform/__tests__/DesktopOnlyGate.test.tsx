import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import DesktopOnlyGate from '@/core/platform/DesktopOnlyGate'
import { MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH } from '@/lib/platform'

function setViewport(width: number, height: number) {
	Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
	Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('DesktopOnlyGate', () => {
	afterEach(cleanup)

	beforeEach(() => {
		setViewport(MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT)
	})

	it('renders children at minimum desktop viewport', async () => {
		render(
			<DesktopOnlyGate>
				<p>Workspace</p>
			</DesktopOnlyGate>,
		)
		expect(await screen.findByText('Workspace')).toBeDefined()
	})

	it('shows placeholder below minimum width', async () => {
		setViewport(MIN_VIEWPORT_WIDTH - 1, MIN_VIEWPORT_HEIGHT)
		render(
			<DesktopOnlyGate>
				<p>Workspace</p>
			</DesktopOnlyGate>,
		)
		expect(await screen.findByTestId('desktop-only-placeholder')).toBeDefined()
		expect(screen.queryByText('Workspace')).toBeNull()
	})

	it('shows placeholder below minimum height', async () => {
		setViewport(MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT - 1)
		render(
			<DesktopOnlyGate>
				<p>Workspace</p>
			</DesktopOnlyGate>,
		)
		expect(await screen.findByTestId('desktop-only-placeholder')).toBeDefined()
	})

	it('reacts to resize below threshold', async () => {
		render(
			<DesktopOnlyGate>
				<p>Workspace</p>
			</DesktopOnlyGate>,
		)
		expect(await screen.findByText('Workspace')).toBeDefined()

		setViewport(800, 600)
		window.dispatchEvent(new Event('resize'))

		expect(await screen.findByTestId('desktop-only-placeholder')).toBeDefined()
		expect(screen.queryByText('Workspace')).toBeNull()
	})
})

describe('isDesktopViewport', () => {
	it('requires both width and height at threshold', async () => {
		const { isDesktopViewport } = await import('@/lib/platform')
		expect(isDesktopViewport(MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT)).toBe(true)
		expect(isDesktopViewport(MIN_VIEWPORT_WIDTH - 1, MIN_VIEWPORT_HEIGHT)).toBe(false)
		expect(isDesktopViewport(MIN_VIEWPORT_WIDTH, MIN_VIEWPORT_HEIGHT - 1)).toBe(false)
	})
})
