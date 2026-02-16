/** 6-dot drag indicator — 3 columns × 2 rows, scoped hover via group/handle */
export default function GrabHandle({ className }: { className?: string }) {
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
						className="size-[2px] rounded-full bg-[#a4abb3] transition-colors duration-150 group-hover/handle:bg-[#444a55]"
					/>
				))}
			</div>
		</div>
	)
}
