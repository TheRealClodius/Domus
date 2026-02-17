import '@testing-library/jest-dom/vitest'

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
