'use client'

import { Slider } from 'radix-ui'

import { cn } from '@/lib/utils'

interface HueSliderProps {
	value: number
	onValueChange: (hue: number) => void
	className?: string
}

/** Hue slider with OKLCH rainbow gradient track and a colored thumb. */
export default function HueSlider({ value, onValueChange, className }: HueSliderProps) {
	return (
		<Slider.Root
			data-testid="hue-slider"
			className={cn('relative flex h-5 w-full touch-none items-center select-none', className)}
			min={0}
			max={360}
			step={1}
			value={[value]}
			onValueChange={([v]) => onValueChange(v)}
		>
			<Slider.Track
				className="relative h-2.5 w-full grow overflow-hidden rounded-full"
				style={{
					background:
						'linear-gradient(to right, oklch(0.7 0.15 0), oklch(0.7 0.15 60), oklch(0.7 0.15 120), oklch(0.7 0.15 180), oklch(0.7 0.15 240), oklch(0.7 0.15 300), oklch(0.7 0.15 360))',
				}}
			>
				{/* No range fill — the gradient IS the track */}
				<Slider.Range className="absolute h-full" />
			</Slider.Track>
			<Slider.Thumb
				className="block size-5 rounded-full border-2 border-white shadow-elevated focus-visible:shadow-focus-ring focus-visible:outline-none"
				style={{ backgroundColor: `oklch(0.65 0.2 ${value})` }}
			/>
		</Slider.Root>
	)
}
