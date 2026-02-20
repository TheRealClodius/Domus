'use client'

import { AlertTriangle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef } from 'react'
import ActiveTurn from '@/core/chat/ActiveTurn'
import AgentTurn from '@/core/chat/AgentTurn'
import { useConversationStore } from '@/core/chat/conversationStore'
import UserBubble from '@/core/chat/UserBubble'
import { SPRING } from '@/lib/motion'

export default function ConversationPanel() {
	const turns = useConversationStore((s) => s.turns)
	const currentTurn = useConversationStore((s) => s.currentTurn)
	const error = useConversationStore((s) => s.error)
	const panelVisible = useConversationStore((s) => s.panelVisible)
	const dismissPanel = useConversationStore((s) => s.dismissPanel)

	const scrollRef = useRef<HTMLDivElement>(null)
	const userScrolledUp = useRef(false)
	const rafId = useRef(0)

	// Dismiss on Escape key
	useEffect(() => {
		if (!panelVisible) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dismissPanel()
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [panelVisible, dismissPanel])

	// Auto-scroll to bottom on new content, coalesced via rAF.
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger uses derived primitives as change signals
	useEffect(() => {
		const el = scrollRef.current
		if (!el || userScrolledUp.current) return
		cancelAnimationFrame(rafId.current)
		rafId.current = requestAnimationFrame(() => {
			el.scrollTop = el.scrollHeight
		})
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
					data-chat-obstacle
					data-testid="conversation-panel"
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 20, scale: 0.95 }}
					transition={SPRING.gentle}
					className="relative w-[400px] overflow-hidden rounded-2xl border border-outline-variant/25"
					style={{
						maxHeight: '60vh',
						backdropFilter: 'blur(40px)',
						WebkitBackdropFilter: 'blur(40px)',
						background: 'var(--surface-glass-heavy)',
					}}
				>
					{/* Close button — floats over scroll content, no background */}
					<button
						type="button"
						onClick={dismissPanel}
						aria-label="Close conversation"
						className="absolute right-2 top-2 z-10 rounded-md p-0.5 text-on-surface-muted transition-colors hover:text-on-surface"
					>
						<X size={16} />
					</button>

					{/* Scroll area — edge-fade mask, content scrolls under close button */}
					<div
						ref={scrollRef}
						className="flex flex-col gap-3 overflow-y-auto scroll-fade px-3 pt-10 pb-10"
						style={{ maxHeight: '60vh', '--scroll-fade-size': '2.5rem' } as React.CSSProperties}
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

						{error && (
							<div
								role="alert"
								aria-live="assertive"
								className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-body text-error"
							>
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
