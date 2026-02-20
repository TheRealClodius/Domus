'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import SheetBackdrop from '@/core/sheet/SheetBackdrop'
import SheetBody from '@/core/sheet/SheetBody'
import SheetHeader from '@/core/sheet/SheetHeader'
import { type SheetContentType, useSheetStore } from '@/core/sheetStore'
import { SPRING } from '@/lib/motion'

interface SheetRenderProps {
	entityId: string | null
	contentType: SheetContentType | null
	sectionId: string | null
}

interface FullScreenSheetProps {
	children: (props: SheetRenderProps) => React.ReactNode
	actions?: React.ReactNode
}

export default function FullScreenSheet({ children, actions }: FullScreenSheetProps) {
	const isOpen = useSheetStore((s) => s.isOpen)
	const entityId = useSheetStore((s) => s.entityId)
	const contentType = useSheetStore((s) => s.contentType)
	const sectionId = useSheetStore((s) => s.sectionId)
	const close = useSheetStore((s) => s.close)
	const fireCloseComplete = useSheetStore((s) => s.fireCloseComplete)

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				close()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, close])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence onExitComplete={fireCloseComplete}>
			{isOpen && (
				<>
					<SheetBackdrop onClose={close} />
					<motion.div
						data-testid="full-screen-sheet"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={SPRING.page}
						className="fixed inset-x-0 bottom-0 bg-surface-lowest shadow-overlay overflow-hidden"
						style={{
							zIndex: 51,
							top: 48,
							borderTopLeftRadius: 20,
							borderTopRightRadius: 20,
						}}
					>
						<SheetHeader onClose={close}>{actions}</SheetHeader>
						<SheetBody>{children({ entityId, contentType, sectionId })}</SheetBody>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	)
}
