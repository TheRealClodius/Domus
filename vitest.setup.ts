import '@testing-library/jest-dom/vitest'

// JSDOM lacks Pointer Capture APIs used by @use-gesture/react.
// Polyfill as no-ops so useDrag({ filterTaps: true }) doesn't crash.
if (typeof Element.prototype.setPointerCapture === 'undefined') {
	Element.prototype.setPointerCapture = () => {}
	Element.prototype.releasePointerCapture = () => {}
	Element.prototype.hasPointerCapture = () => false
}
