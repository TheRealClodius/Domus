'use client'

import { cn } from '@/lib/utils'

interface StepCellProps {
	active: boolean
	accentClass: string
	step: number
	voice: string
	currentStep: number
	onClick: () => void
}

export default function StepCell({
	active,
	accentClass,
	step,
	voice,
	currentStep,
	onClick,
}: StepCellProps) {
	const isCurrent = step === currentStep
	return (
		<button
			type="button"
			aria-label={`step ${voice} ${step}`}
			onClick={onClick}
			className={cn(
				'size-6 rounded-xs transition-colors',
				active ? `bg-${accentClass}` : 'bg-surface-sunken',
				isCurrent && 'ring-1 ring-primary/30',
			)}
		/>
	)
}
