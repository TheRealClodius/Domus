import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import WarmShimmer from '@/core/entity/WarmShimmer'

describe('WarmShimmer', () => {
	afterEach(cleanup)

	it('renders gradient sweep shimmer', () => {
		render(<WarmShimmer />)
		expect(screen.getByTestId('warm-shimmer')).toBeDefined()
		expect(screen.getByTestId('shimmer-sweep')).toBeDefined()
	})

	it('renders label when provided', () => {
		render(<WarmShimmer label="Generating image..." />)
		expect(screen.getByTestId('shimmer-label')).toBeDefined()
		expect(screen.getByText('Generating image...')).toBeDefined()
	})

	it('does not render label when not provided', () => {
		render(<WarmShimmer />)
		expect(screen.queryByTestId('shimmer-label')).toBeNull()
	})
})
