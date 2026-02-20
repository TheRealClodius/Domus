'use client'

import { FolderPlus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEventState, EventAttendee } from '@/apps/calendar/types'
import { markGathering } from '@/core/canvas/SpaceRenderer'
import ConversationPanel from '@/core/chat/ConversationPanel'
import { useChatContextBridge } from '@/core/chat/chatContextBridge'
import { consumeAgentStream, friendlyError } from '@/core/chat/consumeAgentStream'
import { selectStatus, useConversationStore } from '@/core/chat/conversationStore'
import PromptInput from '@/core/chat/PromptInput'
import PromptInputMenu from '@/core/chat/PromptInputMenu'
import {
	type CalendarEventSummary,
	sendMessage,
	serializeContextItems,
} from '@/core/chat/useAgentStream'
import { usePromptInputState } from '@/core/chat/usePromptInputState'
import { useEntityStore } from '@/core/entityStore'
import { FOLDER_SIZE } from '@/core/spatial/folderConstants'
import { SPRING } from '@/lib/motion'

function summarizeCalendarEvents(): CalendarEventSummary[] {
	const entities = useEntityStore.getState().entities
	return Object.values(entities)
		.filter((e) => e.type === 'calendar_event' && !e.archived)
		.map((e) => {
			const state = e.state as CalendarEventState
			const attendees = state.attendees as EventAttendee[] | undefined
			return {
				title: state.title,
				start: state.start,
				end: state.end,
				all_day: state.all_day,
				...(attendees?.length && {
					attendees: attendees.map((a) => a.email),
				}),
			}
		})
}

const FOLDER_GAP = 12

function FolderCreateButton() {
	const buttonRef = useRef<HTMLButtonElement>(null)

	const handleClick = useCallback(() => {
		const store = useEntityStore.getState()
		const ids = Array.from(store.selectedIds)
		if (ids.length < 2) return

		let targetPosition: { x: number; y: number } | undefined
		if (buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect()
			const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
			const canvasRect = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 }
			const existingFolders = Object.values(store.entities).filter(
				(e) => e.presentation === 'folder' && !e.archived,
			)
			const x =
				rect.left -
				canvasRect.left -
				FOLDER_SIZE -
				FOLDER_GAP -
				existingFolders.length * (FOLDER_SIZE + FOLDER_GAP)
			const y = rect.top - canvasRect.top + rect.height / 2 - FOLDER_SIZE - FOLDER_GAP
			targetPosition = { x, y }
		}

		markGathering(ids)
		store.gatherEntities(ids, targetPosition)
		store.clearSelection()
	}, [])

	return (
		<motion.button
			ref={buttonRef}
			type="button"
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			transition={SPRING.popIn}
			onClick={handleClick}
			className="absolute right-full top-1/2 mr-2 flex -translate-y-1/2 whitespace-nowrap items-center gap-1.5 rounded-full bg-surface-raised px-3 py-2 text-label text-on-surface shadow-card hover:bg-surface-raised-hover active:scale-95 transition-colors"
		>
			<FolderPlus size={16} />
			<span>New folder</span>
		</motion.button>
	)
}

export default function AgentChat({ spaceId, userId }: { spaceId: string; userId: string }) {
	const state = usePromptInputState()
	const [menuOpen, setMenuOpen] = useState(false)
	const status = useConversationStore(selectStatus)
	const abortRef = useRef<AbortController | null>(null)
	const selectionCount = useEntityStore((s) => s.selectedIds.size)

	useEffect(() => {
		useChatContextBridge.getState().register(state.addContextItem, state.updateContextItem)
	}, [state.addContextItem, state.updateContextItem])

	const handleSend = useCallback(async () => {
		if (!state.canSend) return
		const text = state.text.trim()
		const capturedContextItems = state.contextItems
		state.reset()

		// Gather spatial context from entity store
		const entityState = useEntityStore.getState()
		const focusedEntityId = entityState.focusedId
		const visibleEntityIds = entityState.getVisibleEntities().map((e) => e.id)
		const viewport = { width: window.innerWidth, height: window.innerHeight }
		const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
		const canvasViewport = {
			width: canvas?.clientWidth ?? window.innerWidth,
			height: canvas?.clientHeight ?? window.innerHeight,
		}

		// Abort any in-flight stream
		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		useConversationStore.getState().addUserTurn(text)

		try {
			const contextItems = await serializeContextItems(capturedContextItems)
			const calendarEvents = summarizeCalendarEvents()
			const stream = await sendMessage({
				spaceId,
				userId,
				message: text,
				signal: controller.signal,
				viewport,
				focusedEntityId,
				visibleEntityIds,
				contextItems,
				calendarEvents,
			})
			await consumeAgentStream(stream, controller.signal, {
				spaceId,
				userId,
				viewport: canvasViewport,
			})
		} catch (err) {
			if (controller.signal.aborted) return
			useConversationStore
				.getState()
				.setError(friendlyError(err instanceof Error ? err.message : 'Failed to send message'))
		}
	}, [state.canSend, state.text, state.contextItems, state.reset, spaceId, userId])

	const handleMenuClose = useCallback(() => setMenuOpen(false), [])

	return (
		<div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
			<ConversationPanel />
			<AnimatePresence>
				{menuOpen && (
					<PromptInputMenu
						onClose={handleMenuClose}
						onAddItem={state.addContextItem}
						onUpdateItem={state.updateContextItem}
					/>
				)}
			</AnimatePresence>
			<div className="relative">
				<AnimatePresence>{selectionCount >= 2 && <FolderCreateButton />}</AnimatePresence>
				<PromptInput
					text={state.text}
					onTextChange={state.setText}
					onSend={handleSend}
					contextItems={state.contextItems}
					onAddContextItem={state.addContextItem}
					onUpdateContextItem={state.updateContextItem}
					onRemoveContextItem={state.removeContextItem}
					isGenerating={status === 'streaming'}
					onStop={() => abortRef.current?.abort()}
					menuOpen={menuOpen}
					onMenuOpenChange={setMenuOpen}
				/>
			</div>
		</div>
	)
}
