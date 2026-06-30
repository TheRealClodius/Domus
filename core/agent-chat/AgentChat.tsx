'use client'

import { FileText, FolderPlus, ImageIcon, MessageSquare } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalendarEventState, EventAttendee } from '@/apps/calendar/types'
import { noteApp } from '@/apps/notes'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import { markGathering } from '@/core/spatial/animationDirector'
import { getActionLabel } from '@/core/agent-chat/actionLabel'
import ConversationPanel from '@/core/agent-chat/ConversationPanel'
import { useChatContextBridge } from '@/core/agent-chat/chatContextBridge'
import { consumeAgentStream, friendlyError } from '@/core/agent-chat/consumeAgentStream'
import { selectStatus, useConversationStore } from '@/core/agent-chat/conversationStore'
import PromptInput from '@/core/agent-chat/PromptInput'
import PromptInputMenu from '@/core/agent-chat/PromptInputMenu'
import {
	type CalendarEventSummary,
	sendMessage,
	serializeContextItems,
} from '@/core/agent-chat/useAgentStream'
import { usePromptInputState } from '@/core/agent-chat/usePromptInputState'
import { useAgentUiStore, useEntityStore, useSpatialStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { FOLDER_SIZE } from '@/core/spatial/folderConstants'
import { Button } from '@/core/ui/button'
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

function ActionButtons({
	spaceId,
	userId,
	onImageClick,
}: {
	spaceId: string
	userId: string
	onImageClick: () => void
}) {
	const folderBtnRef = useRef<HTMLButtonElement>(null)
	const entities = useEntityStore((s) => s.entities)
	const upsert = useEntityStore((s) => s.upsert)
	const setFocused = useEntityStore((s) => s.setFocused)

	const handleNewNote = useCallback(() => {
		const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
		const entity = createEntityFromApp(noteApp, {
			spaceId,
			userId,
			entityCount: Object.keys(entities).length,
			viewportWidth: canvas?.clientWidth ?? window.innerWidth,
			viewportHeight: canvas?.clientHeight ?? window.innerHeight,
		})
		upsert(entity)
		setFocused(entity.id)
		useSheetStore.getState().open(entity.id, 'entity')
	}, [spaceId, userId, entities, upsert, setFocused])

	const handleNewFolder = useCallback(() => {
		const entityStore = useEntityStore.getState()
		const spatialStore = useSpatialStore.getState()
		const ids = Array.from(spatialStore.selectedIds)

		if (ids.length >= 2) {
			let targetPosition: { x: number; y: number } | undefined
			if (folderBtnRef.current) {
				const rect = folderBtnRef.current.getBoundingClientRect()
				const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
				const canvasRect = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 }
				const existingFolders = Object.values(entityStore.entities).filter(
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
			spatialStore.gatherEntities(ids, targetPosition)
			spatialStore.clearSelection()
		} else {
			const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
			const w = canvas?.clientWidth ?? window.innerWidth
			const h = canvas?.clientHeight ?? window.innerHeight
			const maxZ = Math.max(0, ...Object.values(entityStore.entities).map((e) => e.z_index ?? 0))
			const now = new Date().toISOString()
			upsert({
				id: crypto.randomUUID(),
				space_id: spaceId,
				user_id: userId,
				type: 'folder',
				presentation: 'folder',
				position: {
					x: Math.round(w / 2 - FOLDER_SIZE / 2),
					y: Math.round(h / 2 - FOLDER_SIZE / 2),
					locked: true,
				},
				size: { width: FOLDER_SIZE, height: FOLDER_SIZE },
				z_index: maxZ + 1,
				content: '',
				state: { child_ids: [] },
				summary: 'New folder',
				created_by: 'user',
				archived: false,
				created_at: now,
				updated_at: now,
			})
		}
	}, [spaceId, userId, upsert])

	return (
		<div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 flex flex-row gap-3">
			<Button variant="pill-base" size="icon-sm" aria-label="New note" onClick={handleNewNote}>
				<FileText size={14} />
			</Button>
			<Button variant="pill-base" size="icon-sm" aria-label="New image" onClick={onImageClick}>
				<ImageIcon size={14} />
			</Button>
			<Button
				ref={folderBtnRef}
				variant="pill-base"
				size="icon-sm"
				aria-label="New folder"
				onClick={handleNewFolder}
			>
				<FolderPlus size={14} />
			</Button>
		</div>
	)
}

export default function AgentChat({ spaceId, userId }: { spaceId: string; userId: string }) {
	const state = usePromptInputState()
	const [menuOpen, setMenuOpen] = useState(false)
	const status = useConversationStore(selectStatus)
	const panelVisible = useConversationStore((s) => s.panelVisible)
	const currentTurn = useConversationStore((s) => s.currentTurn)
	const abortRef = useRef<AbortController | null>(null)
	const hasTurns = useConversationStore((s) => s.turns.length > 0)
	const showMini = status === 'streaming' && !panelVisible
	const showHistory = hasTurns && !panelVisible && status !== 'streaming'

	const pendingTool = currentTurn?.toolCalls.findLast((tc) => tc.status === 'pending')
	const miniLabel = pendingTool
		? getActionLabel(pendingTool.tool, 'pending', null, pendingTool.args)
		: 'Working…'

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
			const message = friendlyError(err instanceof Error ? err.message : 'Failed to send message')
			const meta = (
				err as Error & { meta?: { code?: string; resets_at?: string; retry_after?: number } }
			).meta
			useConversationStore.getState().setError(message, meta)
		}
	}, [state.canSend, state.text, state.contextItems, state.reset, spaceId, userId])

	const handleMenuClose = useCallback(() => setMenuOpen(false), [])

	const handleImagePromptClick = useCallback(() => {
		state.setText('Generate an image of ')
	}, [state.setText])

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
			<AnimatePresence>
				{showMini && (
					<motion.button
						type="button"
						key="mini-chip"
						initial={{ opacity: 0, y: 4, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 4, scale: 0.95 }}
						transition={SPRING.popIn}
						onClick={() => useConversationStore.setState({ panelVisible: true })}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-surface px-3 py-1.5 text-label text-on-surface-muted shadow-card"
						data-testid="mini-activity-chip"
					>
						<span className="shimmer-sweep absolute inset-0" aria-hidden="true" />
						<span className="relative size-1.5 rounded-full bg-agent animate-pulse" />
						<span className="relative">{miniLabel}</span>
					</motion.button>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{showHistory && (
					<motion.div
						key="history-chip-wrapper"
						initial={{ height: 0, overflow: 'hidden' }}
						animate={{ height: 'auto', overflow: 'visible' }}
						exit={{ height: 0, overflow: 'hidden' }}
						transition={SPRING.popIn}
					>
						<motion.button
							type="button"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={SPRING.popIn}
							onClick={() => useConversationStore.setState({ panelVisible: true })}
							className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-label text-on-surface-muted shadow-card hover:bg-surface-raised hover:text-on-surface transition-colors"
							data-testid="history-chip"
						>
							<MessageSquare size={14} />
							<span>Chat</span>
						</motion.button>
					</motion.div>
				)}
			</AnimatePresence>
			<div className="relative">
				<ActionButtons spaceId={spaceId} userId={userId} onImageClick={handleImagePromptClick} />
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
