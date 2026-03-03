import type { Tone } from '@/core/entity/useImageTone'

const dotClasses: Record<Tone, string> = {
	light: 'bg-black/50 group-hover/handle:bg-black/80',
	dark: 'bg-white/50 group-hover/handle:bg-white/80',
}

/** 6-dot drag indicator — 3 columns × 2 rows, scoped hover via group/handle */
export default function GrabHandle({ className, tone }: { className?: string; tone?: Tone }) {
	const dotColor = tone
		? dotClasses[tone]
		: 'bg-chrome-handle group-hover/handle:bg-chrome-handle-hover'

	return (
		<div
			data-testid="grab-handle"
			className={`group/handle flex items-center justify-center ${className ?? ''}`}
			style={{ width: 40, height: 32 }}
		>
			<div className="grid grid-cols-3 gap-[2px]">
				{(['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const).map((id) => (
					<div
						key={id}
						data-testid="grab-handle-dot"
						className={`size-[2px] rounded-full transition-colors duration-150 ${dotColor}`}
					/>
				))}
			</div>
		</div>
	)
}
