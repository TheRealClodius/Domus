'use client'

const TRANSITION =
	'background 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1)'

export default function WindowControl({ onClick }: { onClick?: () => void }) {
	return (
		<button
			type="button"
			aria-label="Close window"
			onClick={onClick}
			onMouseDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				width: 16,
				height: 16,
				padding: 4,
				borderRadius: 20,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				border: 'none',
				cursor: 'pointer',
				transition: TRANSITION,
				// TODO: tokenize gradient colors into design system
				background: 'linear-gradient(180deg, #8F0000 0%, #FF0000 100%)',
			}}
			className="active:scale-90"
		>
			<span
				data-dot=""
				style={{
					width: 6,
					height: 6,
					borderRadius: 20,
					pointerEvents: 'none',
					backgroundColor: '#FFFFFF',
					transition: 'background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			/>
		</button>
	)
}
