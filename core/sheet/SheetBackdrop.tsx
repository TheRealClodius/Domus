'use client'

import { motion } from 'motion/react'
import { DURATION, MOTION_EASE } from '@/lib/motion'

interface SheetBackdropProps {
	onClose: () => void
}

export default function SheetBackdrop({ onClose }: SheetBackdropProps) {
	return (
		<motion.div
			data-testid="sheet-backdrop"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
			className="fixed inset-0 bg-black/25"
			style={{ zIndex: 50 }}
			onClick={onClose}
		/>
	)
}
