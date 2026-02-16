'use client'

const TRANSITION =
	'background 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)'

export default function WindowControl({
	onClick,
	'aria-label': ariaLabel = 'Close window',
}: {
	onClick?: () => void
	'aria-label'?: string
}) {
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			onClick={onClick}
			onMouseDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				width: 32,
				height: 32,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: 'none',
				cursor: 'pointer',
				transition: TRANSITION,
				background: 'transparent',
			}}
			className="rounded-full active:scale-90"
		>
			<span
				data-dot=""
				style={{
					width: 16,
					height: 16,
					pointerEvents: 'none',
					background:
						'linear-gradient(180deg, var(--control-close-from) 0%, var(--control-close-to) 100%)',
					transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
				className="rounded-full"
			>
				<span
					style={{
						width: 6,
						height: 6,
						pointerEvents: 'none',
						backgroundColor: 'var(--control-close-dot)',
					}}
					className="rounded-full"
				/>
			</span>
		</button>
	)
}
