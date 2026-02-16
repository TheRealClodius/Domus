import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive:
					'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
				// TODO: tokenize pill colors into design system
				'pill-base': 'bg-white/85 hover:bg-white border-white text-on-surface',
				'pill-secondary': 'bg-[#eceff2] hover:bg-[#f5f6f8] border-white text-on-surface',
				'pill-active':
					'bg-[rgba(0,93,255,0.6)] hover:bg-[rgba(0,93,255,0.9)] border-white/30 text-white',
			},
			size: {
				default: 'h-9 rounded-md px-4 py-2 has-[>svg]:px-3',
				xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
				icon: 'size-9 rounded-md',
				'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'size-8 rounded-md',
				'icon-lg': 'size-10 rounded-md',
				pill: 'h-8 px-3 py-1 rounded-lg border-[0.5px] text-sm',
				'pill-lg': 'h-11 px-6 py-2 rounded-xl border-[0.5px] text-base',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

function Button({
	className,
	variant = 'default',
	size = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : 'button'

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
