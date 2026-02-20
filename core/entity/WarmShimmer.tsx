interface WarmShimmerProps {
	label?: string
}

export default function WarmShimmer({ label }: WarmShimmerProps) {
	return (
		<div
			data-testid="warm-shimmer"
			className="relative h-full w-full overflow-hidden rounded-lg bg-surface"
		>
			<div data-testid="shimmer-sweep" className="absolute inset-0 shimmer-sweep" />
			{label && (
				<p
					data-testid="shimmer-label"
					className="absolute bottom-3 left-0 right-0 text-center text-label text-on-surface-muted"
				>
					{label}
				</p>
			)}
		</div>
	)
}
