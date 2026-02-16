import { type RefObject, useCallback, useState } from 'react'

const TEXTAREA_MIN = 46 // 2 lines (23px × 2)
const TEXTAREA_MAX = 184 // 8 lines (23px × 8)

export { TEXTAREA_MIN, TEXTAREA_MAX }

export function useAutoResize(ref: RefObject<HTMLTextAreaElement | null>) {
	const [needsExpand, setNeedsExpand] = useState(false)
	const [measuredHeight, setMeasuredHeight] = useState(TEXTAREA_MIN)

	const measure = useCallback(() => {
		const el = ref.current
		if (!el) return

		// Clone-based measurement (OS1 pattern): create a hidden clone with
		// height:auto to get the natural content height independent of the
		// element's current size constraints.
		const clone = el.cloneNode(false) as HTMLTextAreaElement
		clone.style.position = 'absolute'
		clone.style.visibility = 'hidden'
		clone.style.height = 'auto'
		clone.style.minHeight = '0'
		clone.style.maxHeight = 'none'
		clone.style.width = `${el.clientWidth}px`
		clone.style.fontSize = '0.875rem'
		clone.style.lineHeight = '23px'
		clone.style.fontFamily = 'inherit'
		clone.style.wordBreak = 'break-word'
		clone.style.overflowWrap = 'break-word'
		clone.style.whiteSpace = 'pre-wrap'
		clone.style.boxSizing = 'border-box'
		clone.style.padding = '4px 8px'
		clone.value = el.value

		document.body.appendChild(clone)
		void clone.offsetHeight // force reflow

		const scrollH = clone.scrollHeight
		document.body.removeChild(clone)

		const clamped = Math.max(TEXTAREA_MIN, Math.min(TEXTAREA_MAX, scrollH))
		setNeedsExpand(scrollH > TEXTAREA_MAX)
		setMeasuredHeight(clamped)
	}, [ref])

	return { needsExpand, measuredHeight, measure }
}
