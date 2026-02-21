import '@testing-library/jest-dom/vitest'
import { createElement, forwardRef } from 'react'
import { beforeAll, vi } from 'vitest'

// Track pending dynamic-import promises so we can await them in beforeAll.
const pendingLoads = vi.hoisted(() => [] as Promise<void>[])

// Mock next/dynamic — eagerly call the loader and stash the promise.
// beforeAll (below) awaits all promises so components are resolved before tests run.
vi.mock('next/dynamic', () => ({
	__esModule: true,
	default: (loader: () => Promise<{ default: React.ComponentType }>, _opts?: unknown) => {
		let Component: React.ComponentType | null = null
		const p = loader().then((m) => {
			Component = (m.default ?? m) as React.ComponentType
		})
		pendingLoads.push(p)
		const DynamicComponent = forwardRef(
			(props: Record<string, unknown>, ref: React.Ref<unknown>) => {
				if (!Component) return null
				return createElement(Component, { ...props, ref })
			},
		)
		DynamicComponent.displayName = 'NextDynamic'
		return DynamicComponent
	},
}))

// Await all dynamic imports before any test runs.
beforeAll(async () => {
	await Promise.all(pendingLoads)
})

// JSDOM lacks Pointer Capture APIs used by @use-gesture/react.
// Polyfill as no-ops so useDrag({ filterTaps: true }) doesn't crash.
if (typeof Element.prototype.setPointerCapture === 'undefined') {
	Element.prototype.setPointerCapture = () => {}
	Element.prototype.releasePointerCapture = () => {}
	Element.prototype.hasPointerCapture = () => false
}

// JSDOM lacks ResizeObserver — needed by Radix UI Slider.
if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof globalThis.ResizeObserver
}

// JSDOM lacks scrollIntoView — polyfill as no-op.
if (typeof Element.prototype.scrollIntoView === 'undefined') {
	Element.prototype.scrollIntoView = () => {}
}
