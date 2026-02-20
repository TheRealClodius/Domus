/**
 * Stacked document illustration — a plain document card behind a tilted photo card.
 * Used for "Upload from your computer" and reusable for folder icons.
 *
 * Accepts a `fanned` prop: when false, cards are stacked/centered;
 * when true, they animate out to tilted fan positions via SPRING.gentle.
 */
import { motion } from 'motion/react'

import { SPRING } from '@/lib/motion'

// TODO: For 3-card canvas folder icons, add a third motion.div with its own
// fanned position (e.g. rotate: 5deg, shifted further right). The fanned prop
// pattern already supports this — each card just needs its own A/B positions.

export default function DocumentStackIcon({
	size = 75,
	fanned = false,
}: {
	size?: number
	fanned?: boolean
}) {
	const scale = size / 75

	// State A: cards centered (57×73 card in 75×75 container)
	const centered = { left: 9 * scale, top: 1 * scale, rotate: 0 }

	// State B: fanned positions (derived from Figma 87×85 frame → 75×75 container)
	// Document shifts right and UP, image shifts left and DOWN
	const backFanned = { left: 17 * scale, top: -4 * scale, rotate: 2.3 }
	const frontFanned = { left: 5 * scale, top: 3 * scale, rotate: -8.9 }

	const cardW = 57 * scale
	const cardH = 73 * scale

	return (
		<div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
			{/* Back card — plain document with text lines */}
			<motion.div
				className="absolute rounded-lg bg-surface-lowest shadow-card"
				style={{ width: cardW, height: cardH }}
				initial={centered}
				animate={fanned ? backFanned : centered}
				transition={{ ...SPRING.gentle, delay: fanned ? 0.15 : 0 }}
			>
				{/* Text line placeholders */}
				<div
					className="rounded-full bg-on-surface/10"
					style={{
						position: 'absolute',
						top: 10 * scale,
						left: 8 * scale,
						width: 22 * scale,
						height: 4 * scale,
					}}
				/>
				{[0, 1, 2, 3, 4, 5, 6].map((i) => (
					<div
						key={i}
						className="rounded-full bg-on-surface/10"
						style={{
							position: 'absolute',
							top: (20 + i * 8) * scale,
							left: 8 * scale,
							width: 40 * scale,
							height: 4 * scale,
						}}
					/>
				))}
			</motion.div>

			{/* Front card — photo overlay */}
			<motion.div
				className="absolute overflow-hidden rounded-lg shadow-elevated"
				style={{
					width: cardW,
					height: cardH,
					background: 'linear-gradient(135deg, rgba(145,162,190,0.8), rgba(100,60,80,0.9))',
					// Figma rotation anchor is 19px below card center (~76% height).
					// Top of card swings out more than the bottom during fan-out.
					transformOrigin: 'center 76%',
				}}
				initial={centered}
				animate={fanned ? frontFanned : centered}
				transition={{ ...SPRING.gentle, delay: fanned ? 0.2 : 0 }}
			/>
		</div>
	)
}
