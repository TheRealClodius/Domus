'use client'

import { AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import ActiveTurn from '@/core/chat/ActiveTurn'
import AgentTurn from '@/core/chat/AgentTurn'
import { useConversationStore } from '@/core/chat/conversationStore'
import UserBubble from '@/core/chat/UserBubble'
import { SPRING } from '@/lib/motion'

export default function ConversationPanel() {
	const turns = useConversationStore((s) => s.turns)
	const currentTurn = useConversationStore((s) => s.currentTurn)
	const status = useConversationStore((s) => s.status)
	const error = useConversationStore((s) => s.error)
	const panelVisible = useConversationStore((s) => s.panelVisible)
	const dismissPanel = useConversationStore((s) => s.dismissPanel)

	const scrollRef = useRef<HTMLDivElement>(null)
	const userScrolledUp = useRef(false)

	// Dismiss on Escape key
	useEffect(() => {
		if (!panelVisible) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dismissPanel()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [panelVisible, dismissPanel])

	// Auto-scroll to bottom on new content.
	// Dependencies are intentionally non-reactive values (primitives derived from store)
	// so the effect re-runs when new turns arrive or streaming text grows.
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger uses derived primitives as change signals
	useEffect(() => {
		const el = scrollRef.current
		if (!el || userScrolledUp.current) return
		el.scrollTop = el.scrollHeight
	}, [turns.length, currentTurn?.text, currentTurn?.toolCalls.length])

	// Detect user scrolling up
	useEffect(() => {
		const el = scrollRef.current
		if (!el) return
		const handleScroll = () => {
			const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32
			userScrolledUp.current = !atBottom
		}
		el.addEventListener('scroll', handleScroll)
		return () => el.removeEventListener('scroll', handleScroll)
	}, [])

	return (
		<AnimatePresence>
			{panelVisible && (
				<motion.div
					data-testid="conversation-panel"
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={SPRING.gentle}
					className="w-[400px] overflow-hidden rounded-2xl border border-outline/25"
					style={{
						maxHeight: '60vh',
						backdropFilter: 'blur(40px)',
						WebkitBackdropFilter: 'blur(40px)',
						background: 'var(--surface-glass-heavy)',
					}}
				>
					{/* TODO: Drag handle for pin-to-canvas (deferred) */}

					<div
						ref={scrollRef}
						className="flex flex-col gap-3 overflow-y-auto p-4"
						style={{ maxHeight: '60vh' }}
					>
						{turns.map((turn) =>
							turn.role === 'user' ? (
								<UserBubble key={turn.id} text={turn.text} />
							) : (
								<AgentTurn key={turn.id} turn={turn} />
							),
						)}

						{currentTurn && (
							<ActiveTurn text={currentTurn.text} toolCalls={currentTurn.toolCalls} />
						)}

						{status === 'error' && error && (
							<div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-body text-error">
								<AlertTriangle size={16} />
								<span>{error}</span>
							</div>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
