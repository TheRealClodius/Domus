import { Switch as SwitchPrimitive } from 'radix-ui'
import type * as React from 'react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
	size?: 'default' | 'sm'
	label?: string
}

function Switch({ className, size = 'default', label, id, ...props }: SwitchProps) {
	const generatedId = useId()
	const switchId = id ?? generatedId
	const sm = size === 'sm'

	const switchElement = (
		<SwitchPrimitive.Root
			data-slot="switch"
			id={switchId}
			className={cn(
				'inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-outline transition-colors data-[state=checked]:bg-primary focus-visible:shadow-focus-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
				sm ? 'h-4 w-7' : 'h-5 w-9',
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					'pointer-events-none block rounded-full bg-surface-raised shadow-resting transition-transform data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-full',
					sm ? 'size-3' : 'size-4',
				)}
			/>
		</SwitchPrimitive.Root>
	)

	if (!label) return switchElement

	return (
		<div className="flex items-center gap-2">
			{switchElement}
			<label htmlFor={switchId} className="cursor-pointer text-body text-on-surface">
				{label}
			</label>
		</div>
	)
}

export { Switch }
export type { SwitchProps }
