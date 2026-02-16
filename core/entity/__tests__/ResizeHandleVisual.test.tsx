import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ResizeHandleVisual from '@/core/entity/ResizeHandleVisual'

describe('ResizeHandleVisual', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders an SVG for corner direction nw', () => {
		const { container } = render(<ResizeHandleVisual direction="nw" state="hover" />)
		expect(container.querySelector('svg')).not.toBeNull()
	})

	it('corner handles have 20x20 viewBox', () => {
		const { container } = render(<ResizeHandleVisual direction="se" state="hover" />)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20')
	})

	it('north edge handle has 36x4 viewBox', () => {
		const { container } = render(<ResizeHandleVisual direction="n" state="hover" />)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 36 4')
	})

	it('east edge handle has 4x36 viewBox', () => {
		const { container } = render(<ResizeHandleVisual direction="e" state="hover" />)
		const svg = container.querySelector('svg')
		expect(svg?.getAttribute('viewBox')).toBe('0 0 4 36')
	})

	// --- Wrapper div styles (opacity, transform, transition, position) ---

	it('idle state has opacity 0 on wrapper', () => {
		const { container } = render(<ResizeHandleVisual direction="nw" state="idle" />)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.opacity).toBe('0')
	})

	it('hover state has opacity 1 on wrapper', () => {
		const { container } = render(<ResizeHandleVisual direction="nw" state="hover" />)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.opacity).toBe('1')
	})

	it('active state with expanding has opacity 1', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.opacity).toBe('1')
	})

	it('active+expanding corner has scale(1.05) in transform', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transform).toContain('scale(1.05)')
	})

	it('active+contracting corner has scale(0.95) in transform', () => {
		const { container } = render(
			<ResizeHandleVisual direction="nw" state="active" resizeBehavior="contracting" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transform).toContain('scale(0.95)')
	})

	it('active+expanding edge includes scale in centering transform', () => {
		const { container } = render(
			<ResizeHandleVisual direction="e" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transform).toContain('translateY(-50%)')
		expect(wrapper.style.transform).toContain('scale(1.05)')
	})

	// --- Inset-based breathing (replaces translate-based) ---

	it('active+expanding se handle insets closer to edge (2px)', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.bottom).toBe('2px')
		expect(wrapper.style.right).toBe('2px')
	})

	it('active+contracting nw handle insets further from edge (6px)', () => {
		const { container } = render(
			<ResizeHandleVisual direction="nw" state="active" resizeBehavior="contracting" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.top).toBe('6px')
		expect(wrapper.style.left).toBe('6px')
	})

	it('hover state uses default inset (4px)', () => {
		const { container } = render(<ResizeHandleVisual direction="se" state="hover" />)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.bottom).toBe('4px')
		expect(wrapper.style.right).toBe('4px')
	})

	// --- Transition timing ---

	it('active state uses faster transition timing (0.1s opacity)', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transition).toContain('opacity 0.1s')
	})

	it('active state uses fast transform timing (0.15s)', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transition).toContain('transform 0.15s')
	})

	it('active state includes inset transitions', () => {
		const { container } = render(
			<ResizeHandleVisual direction="se" state="active" resizeBehavior="expanding" />,
		)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transition).toContain('top 0.15s')
		expect(wrapper.style.transition).toContain('bottom 0.15s')
	})

	it('hover state uses slower opacity timing (0.2s ease-in)', () => {
		const { container } = render(<ResizeHandleVisual direction="se" state="hover" />)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.transition).toContain('opacity 0.2s ease-in')
	})

	// --- Absolute positioning ---

	it('wrapper is absolutely positioned inside window', () => {
		const { container } = render(<ResizeHandleVisual direction="se" state="hover" />)
		const wrapper = container.querySelector('[data-resize-visual]') as HTMLElement
		expect(wrapper.style.position).toBe('absolute')
		expect(wrapper.style.pointerEvents).toBe('none')
	})
})
