import { type RefObject, useCallback, useState } from 'react'

import { measureTextHeight } from '@/lib/textMeasure'

const TEXTAREA_MIN = 46 // 2 lines (23px × 2)
const TEXTAREA_MAX = 184 // 8 lines (23px × 8)

// Horizontal padding: 8px left + 8px right (padding: '4px 8px')
const H_PADDING = 16
// Vertical padding: 4px top + 4px bottom
const V_PADDING = 8

export { TEXTAREA_MIN, TEXTAREA_MAX }

export function useAutoResize(ref: RefObject<HTMLTextAreaElement | null>) {
	const [needsExpand, setNeedsExpand] = useState(false)
	const [measuredHeight, setMeasuredHeight] = useState(TEXTAREA_MIN)

	const measure = useCallback(() => {
		const el = ref.current
		if (!el || el.clientWidth <= 0) return

		const contentWidth = el.clientWidth - H_PADDING
		const height = measureTextHeight(el.value, contentWidth, V_PADDING)

		const clamped = Math.max(TEXTAREA_MIN, Math.min(TEXTAREA_MAX, height))
		setNeedsExpand(height > TEXTAREA_MAX)
		setMeasuredHeight(clamped)
	}, [ref])

	return { needsExpand, measuredHeight, measure }
}
