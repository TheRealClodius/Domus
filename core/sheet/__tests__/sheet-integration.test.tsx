import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import { useSheetStore } from '@/core/sheetStore'

describe('Sheet integration', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('full open-close cycle via store', async () => {
		render(<FullScreenSheet>{({ entityId }) => <p>Viewing {entityId}</p>}</FullScreenSheet>)

		// Initially closed
		expect(screen.queryByTestId('full-screen-sheet')).toBeNull()

		// Open via store
		useSheetStore.getState().open('test-entity', 'entity')

		// Sheet appears with content
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()
		expect(screen.getByText('Viewing test-entity')).toBeDefined()
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()

		// Close via close button
		await userEvent.click(screen.getByRole('button', { name: 'Close sheet' }))
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('Escape key dismisses sheet', async () => {
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)

		useSheetStore.getState().open('test-entity', 'entity')
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		await userEvent.keyboard('{Escape}')
		expect(useSheetStore.getState().isOpen).toBe(false)
	})
})
