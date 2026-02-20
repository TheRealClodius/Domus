import { Slider as SliderPrimitive } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
	size?: 'default' | 'sm'
	label?: string
	valueDisplay?: string
}

function Slider({ className, size = 'default', label, valueDisplay, ...props }: SliderProps) {
	const sm = size === 'sm'

	return (
		<div data-slot="slider-wrapper">
			{(label || valueDisplay) && (
				<div className="mb-1.5 flex items-center justify-between">
					{label && <span className="text-body text-on-surface-muted">{label}</span>}
					{valueDisplay && (
						<span className="text-label text-on-surface-muted tabular-nums">{valueDisplay}</span>
					)}
				</div>
			)}
			<SliderPrimitive.Root
				data-slot="slider"
				className={cn(
					'relative flex w-full touch-none items-center select-none',
					sm ? 'h-3.5' : 'h-4',
					className,
				)}
				{...props}
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						'relative w-full grow overflow-hidden rounded-full bg-surface',
						sm ? 'h-1' : 'h-1.5',
					)}
				>
					<SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
				</SliderPrimitive.Track>
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					className={cn(
						'block rounded-full border-2 border-primary bg-surface-lowest shadow-resting focus-visible:shadow-focus-ring focus-visible:outline-none',
						sm ? 'size-3.5' : 'size-4',
					)}
				/>
			</SliderPrimitive.Root>
		</div>
	)
}

export { Slider }
export type { SliderProps }
