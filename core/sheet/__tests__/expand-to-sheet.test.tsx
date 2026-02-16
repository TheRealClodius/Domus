import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasCard from '@/core/entity/CanvasCard'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 0, y: 0, locked: false },
		size: { width: 280, height: 200 },
		z_index: 1,
		content: '',
		state: {},
		summary: 'A test card',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

/**
 * Renders a CanvasCard alongside a FullScreenSheet so expand clicks
 * flow through to visible sheet rendering — the full contract.
 *
 * Note: card-actions has `pointer-events-none` (hover-only in CSS),
 * so we use fireEvent.click for the expand button (bypasses CSS check)
 * and userEvent for sheet interactions (close button, backdrop, keyboard).
 */
function renderCardWithSheet(entity: Entity) {
	return render(
		<>
			<CanvasCard entity={entity} />
			<FullScreenSheet>
				{({ entityId, contentType }) => (
					<p data-testid="sheet-content">
						{contentType}:{entityId}
					</p>
				)}
			</FullScreenSheet>
		</>,
	)
}

/** Click the expand button via fireEvent (bypasses pointer-events-none CSS). */
function clickExpand(button?: HTMLElement) {
	const btn = button ?? screen.getByRole('button', { name: 'Expand' })
	fireEvent.click(btn)
}

describe('Expand → Sheet (end-to-end)', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	// ── Expand opens sheet ─────────────────────────────────────

	it('clicking expand opens the sheet with the correct entity', async () => {
		const entity = makeEntity({ id: 'note-42' })
		renderCardWithSheet(entity)

		clickExpand()

		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()
		expect(screen.getByTestId('sheet-content').textContent).toBe('entity:note-42')
	})

	it('sheet store state matches after expand click', () => {
		const entity = makeEntity({ id: 'note-7' })
		renderCardWithSheet(entity)

		clickExpand()

		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBe('note-7')
		expect(state.contentType).toBe('entity')
	})

	it('sheet header with close button is present after expand', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()

		expect(await screen.findByTestId('sheet-header')).toBeDefined()
		expect(screen.getByRole('button', { name: 'Close sheet' })).toBeDefined()
	})

	it('sheet backdrop is present after expand', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()

		expect(await screen.findByTestId('sheet-backdrop')).toBeDefined()
	})

	// ── Dismiss paths ──────────────────────────────────────────

	it('close button dismisses sheet after expand', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		await userEvent.click(screen.getByRole('button', { name: 'Close sheet' }))

		expect(useSheetStore.getState().isOpen).toBe(false)
		expect(useSheetStore.getState().entityId).toBeNull()
		expect(useSheetStore.getState().contentType).toBeNull()
	})

	it('backdrop click dismisses sheet after expand', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		await userEvent.click(screen.getByTestId('sheet-backdrop'))

		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('Escape key dismisses sheet after expand', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		await userEvent.keyboard('{Escape}')

		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	// ── Close resets all state ─────────────────────────────────

	it('close after expand resets streaming state', async () => {
		renderCardWithSheet(makeEntity())

		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		// Simulate agent streaming in progress
		useSheetStore.getState().startStreaming()
		useSheetStore.getState().setAgentCursorPosition(42)

		await userEvent.click(screen.getByRole('button', { name: 'Close sheet' }))

		const state = useSheetStore.getState()
		expect(state.agentStreaming).toBe(false)
		expect(state.streamPaused).toBe(false)
		expect(state.agentCursorPosition).toBeNull()
	})

	// ── Replacing sheet content ────────────────────────────────

	it('expanding a second card replaces the sheet content', async () => {
		const entityA = makeEntity({ id: 'card-A' })
		const entityB = makeEntity({ id: 'card-B' })

		render(
			<>
				<div data-testid="card-a">
					<CanvasCard entity={entityA} />
				</div>
				<div data-testid="card-b">
					<CanvasCard entity={entityB} />
				</div>
				<FullScreenSheet>
					{({ entityId }) => <p data-testid="sheet-content">viewing:{entityId}</p>}
				</FullScreenSheet>
			</>,
		)

		// Expand first card
		const expandButtons = screen.getAllByRole('button', { name: 'Expand' })
		fireEvent.click(expandButtons[0])
		expect(await screen.findByTestId('sheet-content')).toBeDefined()
		expect(screen.getByTestId('sheet-content').textContent).toBe('viewing:card-A')

		// Expand second card (replaces)
		fireEvent.click(expandButtons[1])
		expect(screen.getByTestId('sheet-content').textContent).toBe('viewing:card-B')
		expect(useSheetStore.getState().entityId).toBe('card-B')
	})

	// ── Expand does not propagate ──────────────────────────────

	it('expand click does not propagate to card container', () => {
		const entity = makeEntity()
		let outerClicked = false

		render(
			// biome-ignore lint: test-only click listener
			<div
				onClick={() => {
					outerClicked = true
				}}
			>
				<CanvasCard entity={entity} />
				<FullScreenSheet>{() => <p>sheet</p>}</FullScreenSheet>
			</div>,
		)

		clickExpand()

		expect(outerClicked).toBe(false)
	})

	// ── Re-expand after close ──────────────────────────────────

	it('card can be re-expanded after sheet is closed', async () => {
		renderCardWithSheet(makeEntity({ id: 're-open-test' }))

		// First open
		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		// Close
		await userEvent.keyboard('{Escape}')
		expect(useSheetStore.getState().isOpen).toBe(false)

		// Re-open
		clickExpand()
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()
		expect(screen.getByTestId('sheet-content').textContent).toBe('entity:re-open-test')
	})
})
