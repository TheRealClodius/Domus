import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'
import WindowHeader from '@/core/entity/WindowHeader'
import WindowHeaderOptions from '@/core/entity/WindowHeaderOptions'

const noopBind = () => ({})

describe('WindowHeader', () => {
	afterEach(() => cleanup())

	it('renders close button with "Close window" label', () => {
		render(<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />)
		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
	})

	it('close click calls onClose', () => {
		const onClose = vi.fn()
		render(<WindowHeader isFocused={true} onClose={onClose} dragBind={noopBind} />)
		fireEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('renders drag zone with data-window-header, absolute, z-0', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />,
		)
		const header = container.querySelector('[data-window-header]') as HTMLElement
		expect(header).not.toBeNull()
		expect(header.className).toContain('absolute')
		expect(header.className).toContain('z-0')
	})

	it('does not render actions wrapper when no children', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind} />,
		)
		const actions = container.querySelector('[data-window-actions]')
		expect(actions).toBeNull()
	})

	it('renders children in actions slot when provided', () => {
		render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Options</button>
			</WindowHeader>,
		)
		expect(screen.getByRole('button', { name: 'Options' })).toBeDefined()
	})

	it('unfocused state reduces opacity on outer frame', () => {
		const { container } = render(
			<WindowHeader isFocused={false} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Action</button>
			</WindowHeader>,
		)
		const frame = container.querySelector('[data-window-frame]') as HTMLElement
		expect(frame.className).toContain('opacity-85')
	})

	it('focused state has full opacity on outer frame', () => {
		const { container } = render(
			<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind}>
				<button type="button">Action</button>
			</WindowHeader>,
		)
		const frame = container.querySelector('[data-window-frame]') as HTMLElement
		expect(frame.className).toContain('opacity-100')
	})

	// user-event v14 walks up the DOM tree calling getComputedStyle(el).pointerEvents on each
	// ancestor. JSDOM only sees pointer-events from *inline styles*, not CSS class names.
	// So to test that the actions wrapper is transparent to pointer events AND that the
	// buttons inside are still interactive, we must assert with inline styles — which is
	// exactly what a real CSS engine would enforce.
	it('action buttons are clickable even when actions wrapper carries pointer-events:none', async () => {
		const user = userEvent.setup()
		const buttonClickSpy = vi.fn()

		// Wrap in a div that declares pointer-events:none as an inline style so user-event
		// (and JSDOM's getComputedStyle) can actually detect it walking up the tree.
		const { container } = render(
			<div style={{ pointerEvents: 'none' }}>
				<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={noopBind}>
					<button type="button" onClick={buttonClickSpy}>
						Action
					</button>
				</WindowHeader>
			</div>,
		)

		// user-event v14: walks ancestors — finds pointer-events:none on the outer div,
		// throws unless the button (or a closer ancestor) explicitly re-declares auto.
		// Currently fails because no element in the tree re-enables pointer events.
		await user.click(screen.getByRole('button', { name: 'Action' }))
		expect(buttonClickSpy).toHaveBeenCalledOnce()

		// Drag zone is independently reachable via direct pointer-down
		const dragZone = container.querySelector('[data-window-header]') as HTMLElement
		const onPointerDown = vi.fn()
		dragZone.addEventListener('pointerdown', onPointerDown)
		fireEvent.pointerDown(dragZone)
		expect(onPointerDown).toHaveBeenCalledOnce()
	})
})

// ---------------------------------------------------------------------------
// Per-app header scenarios — draggable + options clickable
//
// Each app that provides windowActions gets its own block. We verify:
// 1. The drag zone is wired and receives pointer-down
// 2. Option buttons fire their handlers
//
// Stacking isolation (preventing app content from escaping above the header)
// is tested in Window.test.tsx, not here.
// ---------------------------------------------------------------------------

describe('per-app header — draggable and options clickable', () => {
	afterEach(() => cleanup())

	function renderHeader(children?: React.ReactNode) {
		const dragSpy = vi.fn()
		const dragBind = () => ({ onPointerDown: dragSpy })
		const result = render(
			<div style={{ pointerEvents: 'none' }}>
				<WindowHeader isFocused={true} onClose={vi.fn()} dragBind={dragBind}>
					{children}
				</WindowHeader>
			</div>,
		)
		return { ...result, dragSpy }
	}

	// -- settings (no header actions) ------------------------------------------

	describe('settings (no actions)', () => {
		it('drag zone receives pointer-down', () => {
			const { container, dragSpy } = renderHeader()
			const dragZone = container.querySelector('[data-window-header]') as HTMLElement
			fireEvent.pointerDown(dragZone)
			expect(dragSpy).toHaveBeenCalledOnce()
		})
	})

	// -- calendar (WindowHeaderOptions radio) ----------------------------------

	describe('calendar (radio view switcher)', () => {
		it('drag zone receives pointer-down', () => {
			const { container, dragSpy } = renderHeader(
				<WindowHeaderOptions
					mode="radio"
					options={[
						{ key: 'month', label: 'M', onClick: vi.fn(), isActive: true },
						{ key: 'week', label: 'W', onClick: vi.fn() },
					]}
				/>,
			)
			const dragZone = container.querySelector('[data-window-header]') as HTMLElement
			fireEvent.pointerDown(dragZone)
			expect(dragSpy).toHaveBeenCalledOnce()
		})

		it('view buttons are clickable', async () => {
			const user = userEvent.setup()
			const spy = vi.fn()
			renderHeader(
				<WindowHeaderOptions
					mode="radio"
					options={[
						{ key: 'month', label: 'M', onClick: spy, isActive: true },
						{ key: 'week', label: 'W', onClick: spy },
					]}
				/>,
			)
			await user.click(screen.getByRole('button', { name: 'W' }))
			expect(spy).toHaveBeenCalledOnce()
		})
	})

	// -- sounds (WindowHeaderOptions action) -----------------------------------

	describe('sounds (transport toggle)', () => {
		it('drag zone receives pointer-down', () => {
			const { container, dragSpy } = renderHeader(
				<WindowHeaderOptions options={[{ key: 'play', label: 'Play', onClick: vi.fn() }]} />,
			)
			const dragZone = container.querySelector('[data-window-header]') as HTMLElement
			fireEvent.pointerDown(dragZone)
			expect(dragSpy).toHaveBeenCalledOnce()
		})

		it('play button is clickable', async () => {
			const user = userEvent.setup()
			const spy = vi.fn()
			renderHeader(<WindowHeaderOptions options={[{ key: 'play', label: 'Play', onClick: spy }]} />)
			await user.click(screen.getByRole('button', { name: 'Play' }))
			expect(spy).toHaveBeenCalledOnce()
		})
	})

	// -- chat (ChatHeaderButtons — full-width layout) --------------------------

	describe('chat (full-width header buttons)', () => {
		function chatActions(overrides?: Partial<Parameters<typeof ChatHeaderButtons>[0]>) {
			return (
				<ChatHeaderButtons
					activeGroupName="General"
					activeSidebar={null}
					onToggleGroups={vi.fn()}
					onToggleSettings={vi.fn()}
					{...overrides}
				/>
			)
		}

		it('drag zone receives pointer-down', () => {
			const { container, dragSpy } = renderHeader(chatActions())
			const dragZone = container.querySelector('[data-window-header]') as HTMLElement
			fireEvent.pointerDown(dragZone)
			expect(dragSpy).toHaveBeenCalledOnce()
		})

		it('header buttons are clickable', async () => {
			const user = userEvent.setup()
			const groupsSpy = vi.fn()
			const settingsSpy = vi.fn()
			renderHeader(chatActions({ onToggleGroups: groupsSpy, onToggleSettings: settingsSpy }))
			await user.click(screen.getByRole('button', { name: 'Chats' }))
			expect(groupsSpy).toHaveBeenCalledOnce()
			await user.click(screen.getByRole('button', { name: 'General' }))
			expect(settingsSpy).toHaveBeenCalledOnce()
		})
	})
})
