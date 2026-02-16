import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasShell from '@/core/canvas/CanvasShell'
import { useSheetStore } from '@/core/sheetStore'

describe('CanvasShell', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('renders children', () => {
		render(
			<CanvasShell>
				<p>Canvas content</p>
			</CanvasShell>,
		)
		expect(screen.getByText('Canvas content')).toBeDefined()
	})

	it('does not scale when sheet is closed', () => {
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.transform).toBe('')
	})

	it('scales down when sheet is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.transform).toBe('scale(0.96)')
	})

	it('disables pointer events when sheet is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.pointerEvents).toBe('none')
	})
})
