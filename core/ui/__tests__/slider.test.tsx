import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Slider } from '@/core/ui/slider'

describe('Slider', () => {
	afterEach(() => cleanup())

	it('renders slider role', () => {
		render(<Slider defaultValue={[50]} />)
		expect(screen.getByRole('slider')).toBeDefined()
	})

	it('renders label', () => {
		render(<Slider defaultValue={[50]} label="BPM" />)
		expect(screen.getByText('BPM')).toBeDefined()
	})

	it('renders value display', () => {
		render(<Slider defaultValue={[120]} valueDisplay="120 bpm" />)
		expect(screen.getByText('120 bpm')).toBeDefined()
	})

	it('hides label row when no label or valueDisplay', () => {
		const { container } = render(<Slider defaultValue={[50]} />)
		const wrapper = container.querySelector('[data-slot="slider-wrapper"]')
		expect(wrapper?.children).toHaveLength(1)
	})

	it('merges className', () => {
		render(<Slider defaultValue={[50]} className="custom-class" />)
		const slider = screen.getByRole('slider').closest('[data-slot="slider"]')
		expect(slider?.className).toContain('custom-class')
	})

	it('passes min/max/step to Radix', () => {
		render(<Slider defaultValue={[5]} min={0} max={10} step={1} />)
		const thumb = screen.getByRole('slider')
		expect(thumb.getAttribute('aria-valuemin')).toBe('0')
		expect(thumb.getAttribute('aria-valuemax')).toBe('10')
		expect(thumb.getAttribute('aria-valuenow')).toBe('5')
	})
})
