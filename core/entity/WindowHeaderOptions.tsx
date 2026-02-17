import { Button } from '@/core/ui/button'

export interface WindowHeaderOption {
	key: string
	label: string
	onClick: () => void
	isActive?: boolean
}

interface WindowHeaderOptionsProps {
	options: WindowHeaderOption[]
	mode?: 'radio' | 'action'
}

export default function WindowHeaderOptions({
	options,
	mode = 'action',
}: WindowHeaderOptionsProps) {
	return (
		<div className="flex gap-1">
			{options.map((opt) => (
				<Button
					key={opt.key}
					variant={
						mode === 'radio' ? (opt.isActive ? 'pill-active' : 'pill-secondary') : 'pill-base'
					}
					size="pill"
					onClick={opt.onClick}
				>
					{opt.label}
				</Button>
			))}
		</div>
	)
}
