import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import { useSheetStore } from '@/core/sheetStore'

describe('FullScreenSheet', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('does not render when store is closed', () => {
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		expect(screen.queryByTestId('sheet-backdrop')).toBeNull()
	})

	it('renders backdrop and header when store is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()
		expect(screen.getByTestId('sheet-header')).toBeDefined()
	})

	it('renders children content when open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Sheet content</p>}</FullScreenSheet>)
		expect(screen.getByText('Sheet content')).toBeDefined()
	})

	it('closes on Escape key', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		await userEvent.keyboard('{Escape}')
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('closes on backdrop click', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		await userEvent.click(screen.getByTestId('sheet-backdrop'))
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('passes entityId and contentType to children render prop', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<FullScreenSheet>
				{({ entityId, contentType }) => (
					<p>
						{entityId}-{contentType}
					</p>
				)}
			</FullScreenSheet>,
		)
		expect(screen.getByText('entity-1-entity')).toBeDefined()
	})
})
