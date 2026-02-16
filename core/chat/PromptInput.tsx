'use client'

import { ArrowUp, Square } from 'lucide-react'
import { motion } from 'motion/react'
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'

import PromptInputChips from '@/core/chat/PromptInputChips'
import PromptInputMenu from '@/core/chat/PromptInputMenu'
import { TEXTAREA_MAX, TEXTAREA_MIN, useAutoResize } from '@/core/chat/useAutoResize'
import { usePromptInputDrop } from '@/core/chat/usePromptInputDrop'
import type { ContextItem } from '@/core/chat/usePromptInputState'
import { Button } from '@/core/ui/button'
import { ulid } from '@/lib/id'
import { DURATION, MOTION_EASE, SPRING } from '@/lib/motion'
import { cn } from '@/lib/utils'

// ── Layout constants (OS1-matched) ──────────────────────────────────

type Layout = 'IDLE' | 'CLICKED' | 'BIG'

const IDLE_WIDTH = 280
const CLICKED_WIDTH = 350
const COMPACT_HEIGHT = 51 // 35px textarea + 16px container padding
const LINE_HEIGHT = 23
const TEXTAREA_CLICKED = 35

// BIG mode height formula: chipsRow + textareaH + INNER_GAP + BUTTON_HEIGHT + CONTAINER_PADDING
const CHIP_HEIGHT = 45
const CHIP_ROW_GAP = 8 // spacing after chips row
const INNER_GAP = 8 // between child elements (menu, textarea, send)
const BUTTON_HEIGHT = 32
const CONTAINER_PADDING = 16 // 8px × 2

const OUTLINE_SLIM = 1
const OUTLINE_FOCUS = 8
const CONTAINER_RADIUS = 20 // pill button radius (12) + padding (8) — concentric

// ── Component ───────────────────────────────────────────────────────

interface PromptInputProps {
	text: string
	onTextChange: (text: string) => void
	onSend: () => void
	contextItems: ContextItem[]
	onAddContextItem: (item: ContextItem) => void
	onRemoveContextItem: (id: string) => void
	isGenerating: boolean
	onStop: () => void
	disabled?: boolean
	placeholder?: string
	promptAreaRef?: React.RefObject<HTMLDivElement | null>
}

export default function PromptInput({
	text,
	onTextChange,
	onSend,
	contextItems,
	onAddContextItem,
	onRemoveContextItem,
	isGenerating,
	onStop,
	disabled = false,
	placeholder = 'Message...',
	promptAreaRef,
}: PromptInputProps) {
	const [layout, setLayout] = useState<Layout>(() => {
		if (contextItems.length > 0) return 'BIG'
		if (text.trim()) return 'CLICKED'
		return 'IDLE'
	})
	const [menuOpen, setMenuOpen] = useState(false)
	const [isComposing, setIsComposing] = useState(false)
	const [topGradientOpacity, setTopGradientOpacity] = useState(0)
	const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const justTransitionedToBigRef = useRef(false)
	const { measuredHeight, measure } = useAutoResize(textareaRef)

	const hasContent = text.trim() !== '' || contextItems.length > 0
	const canSend = hasContent && !disabled

	// ── Drag-and-drop ───────────────────────────────────────────────

	const { isDragOver, dropHandlers } = usePromptInputDrop({
		onFilesAccepted: (files) => {
			for (const file of files) {
				const isImage = file.type.startsWith('image/')
				onAddContextItem({
					id: ulid(),
					file,
					name: file.name,
					type: isImage ? 'image' : 'document',
					status: 'ready',
				})
			}
		},
		maxItems: 10,
		currentCount: contextItems.length,
	})

	// ── Layout state machine (OS1-matched) ──────────────────────────

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return

		const hasText = text.trim() !== ''
		const hasChips = contextItems.length > 0 || isDragOver

		// Direct BIG → IDLE: content fully cleared
		if (layout === 'BIG' && !hasText && !hasChips) {
			setLayout('IDLE')
			return
		}

		if (layout === 'IDLE') return

		if (layout === 'CLICKED') {
			// CLICKED → BIG: chips added or text overflows (+2px buffer)
			if (hasChips || textarea.scrollHeight > textarea.clientHeight + 2) {
				setLayout('BIG')
				justTransitionedToBigRef.current = true
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						justTransitionedToBigRef.current = false
					})
				})
			}
			return
		}

		// layout === 'BIG'
		if (justTransitionedToBigRef.current) return

		// BIG → CLICKED: clone-based shrink detection (no chips, text fits in CLICKED)
		if (!hasChips) {
			const clone = textarea.cloneNode(false) as HTMLTextAreaElement
			clone.style.position = 'absolute'
			clone.style.visibility = 'hidden'
			clone.style.height = `${TEXTAREA_CLICKED}px`
			clone.style.minHeight = `${TEXTAREA_CLICKED}px`
			clone.style.maxHeight = `${TEXTAREA_CLICKED}px`
			clone.style.width = `${textarea.clientWidth}px`
			clone.style.fontSize = '0.875rem'
			clone.style.lineHeight = `${LINE_HEIGHT}px`
			clone.style.wordBreak = 'break-word'
			clone.style.overflowWrap = 'break-word'
			clone.style.whiteSpace = 'pre-wrap'
			clone.style.padding = '6px'
			clone.value = text
			document.body.appendChild(clone)
			void clone.offsetHeight
			const wouldFit = clone.scrollHeight <= TEXTAREA_CLICKED + 2
			document.body.removeChild(clone)

			if (wouldFit) {
				setLayout('CLICKED')
			}
		}
	}, [layout, text, contextItems.length, isDragOver])

	// ── Scroll gradients (BIG mode only) ────────────────────────────

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea || layout !== 'BIG') {
			setTopGradientOpacity(0)
			setBottomGradientOpacity(0)
			return
		}

		const updateGradients = () => {
			const { scrollTop, scrollHeight, clientHeight } = textarea
			if (scrollHeight <= clientHeight) {
				setTopGradientOpacity(0)
				setBottomGradientOpacity(0)
				return
			}
			const pct = scrollTop / (scrollHeight - clientHeight)
			setTopGradientOpacity(Math.min(1, pct / 0.1))
			setBottomGradientOpacity(Math.min(1, (1 - pct) / 0.1))
		}

		updateGradients()
		textarea.addEventListener('scroll', updateGradients)

		let observer: ResizeObserver | null = null
		if (typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(updateGradients)
			observer.observe(textarea)
		}

		return () => {
			textarea.removeEventListener('scroll', updateGradients)
			observer?.disconnect()
		}
	}, [layout])

	// ── Handlers ────────────────────────────────────────────────────

	const handleTextChange = useCallback(
		(value: string) => {
			onTextChange(value)
			requestAnimationFrame(() => measure())
		},
		[onTextChange, measure],
	)

	const handleClick = useCallback(() => {
		if (layout === 'IDLE') {
			setLayout('CLICKED')
			textareaRef.current?.focus()
		}
	}, [layout])

	const handleBlur = useCallback(
		(e: React.FocusEvent) => {
			// Stay in current layout if focus moved to another element inside the container
			if (containerRef.current?.contains(e.relatedTarget as Node)) return
			if (!hasContent && !menuOpen && !justTransitionedToBigRef.current) {
				setLayout('IDLE')
			}
		},
		[hasContent, menuOpen],
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
				e.preventDefault()
				if (canSend) {
					onSend()
				}
			}
		},
		[isComposing, canSend, onSend],
	)

	const handleSendClick = useCallback(() => {
		if (isGenerating) {
			onStop()
		} else if (canSend) {
			onSend()
		}
	}, [isGenerating, canSend, onSend, onStop])

	// ── Animation targets ───────────────────────────────────────────

	const isBig = layout === 'BIG'
	const isIdle = layout === 'IDLE'
	const isHorizontal = !isBig

	const targetWidth = isIdle ? IDLE_WIDTH : CLICKED_WIDTH
	let targetHeight = COMPACT_HEIGHT
	if (isBig) {
		const textareaH = Math.max(TEXTAREA_MIN, Math.min(TEXTAREA_MAX, measuredHeight))
		const chipsH = contextItems.length > 0 || isDragOver ? CHIP_HEIGHT + CHIP_ROW_GAP : 0
		targetHeight = chipsH + textareaH + INNER_GAP + BUTTON_HEIGHT + CONTAINER_PADDING
	}

	// OS1-matched transitions:
	// IDLE ↔ CLICKED: spring (underdamped, stiffness 300, damping 20)
	// → BIG: tween (height 0.2s resolves first, width 0.3s catches up)
	const transition =
		isIdle || layout === 'CLICKED'
			? {
					width: SPRING.prompt,
					height: SPRING.prompt,
				}
			: {
					width: { duration: DURATION.medium, ease: MOTION_EASE.out },
					height: { duration: DURATION.hover, ease: MOTION_EASE.out },
				}

	// Outline: instant swap — IDLE: thin neutral, Focus: thick primary (design-direction P7)
	const outlineStyle =
		isIdle && !isDragOver
			? `${OUTLINE_SLIM}px solid color-mix(in oklch, var(--outline) 25%, transparent)`
			: `${OUTLINE_FOCUS}px solid color-mix(in oklch, var(--primary) 25%, transparent)`

	// Textarea styles — conditional on layout, applied to a SINGLE persistent element
	const textareaH = Math.max(TEXTAREA_MIN, Math.min(TEXTAREA_MAX, measuredHeight))
	const textareaStyle = isHorizontal
		? {
				height: TEXTAREA_CLICKED,
				paddingTop: 6,
				paddingBottom: 6,
				paddingLeft: 0,
				paddingRight: 0,
				overflowY: 'hidden' as const,
			}
		: {
				height: textareaH,
				padding: '4px 8px',
				overflowY: textareaH >= TEXTAREA_MAX ? ('auto' as const) : ('hidden' as const),
			}

	const hasChipsOrDrag = contextItems.length > 0 || isDragOver

	// ── Render ──────────────────────────────────────────────────────

	return (
		<motion.div
			animate={{ width: targetWidth, height: targetHeight }}
			transition={transition}
			onClick={handleClick}
			onDragEnter={dropHandlers.onDragEnter as unknown as React.DragEventHandler}
			onDragOver={dropHandlers.onDragOver as unknown as React.DragEventHandler}
			onDragLeave={dropHandlers.onDragLeave as unknown as React.DragEventHandler}
			onDrop={dropHandlers.onDrop as unknown as React.DragEventHandler}
			className={cn(
				'relative overflow-hidden bg-surface-raised',
				disabled && 'pointer-events-none opacity-50',
			)}
			style={{
				display: 'flex',
				flexDirection: isHorizontal ? 'row' : 'column',
				alignItems: isHorizontal ? 'center' : 'stretch',
				gap: INNER_GAP,
				padding: 8,
				borderRadius: CONTAINER_RADIUS,
				outline: outlineStyle,
				outlineOffset: 0,
			}}
		>
			{/* ── Chips row (BIG only) ─────────────────────────────────── */}
			{isBig && hasChipsOrDrag && (
				<PromptInputChips
					items={contextItems}
					onRemove={onRemoveContextItem}
					isDragOver={isDragOver}
				/>
			)}

			{/* ── Horizontal: inline menu button ──────────────────────── */}
			{isHorizontal && (
				<PromptInputMenu
					open={menuOpen}
					onOpenChange={setMenuOpen}
					onAddItem={onAddContextItem}
					onUpdateItem={() => {}}
					promptAreaRef={promptAreaRef}
				/>
			)}

			{/* ── Textarea wrapper (single persistent element) ────────── */}
			<div
				className="relative"
				style={{
					flex: isHorizontal ? 1 : 'none',
					minWidth: 0,
					display: isHorizontal ? 'flex' : 'block',
					alignItems: isHorizontal ? 'center' : undefined,
				}}
			>
				{/* Scroll-driven gradient overlays (BIG only) */}
				{isBig && (
					<>
						<div
							className="pointer-events-none absolute inset-x-0 top-0 z-10"
							style={{
								height: 24,
								background: 'linear-gradient(180deg, var(--surface-glass) 0%, transparent 100%)',
								opacity: topGradientOpacity,
								transition: 'opacity 150ms ease-out',
							}}
						/>
						<div
							className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
							style={{
								height: 24,
								background: 'linear-gradient(0deg, var(--surface-glass) 0%, transparent 100%)',
								opacity: bottomGradientOpacity,
								transition: 'opacity 150ms ease-out',
							}}
						/>
					</>
				)}

				<textarea
					ref={textareaRef}
					value={text}
					onChange={(e) => handleTextChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
					onCompositionStart={() => setIsComposing(true)}
					onCompositionEnd={() => setIsComposing(false)}
					placeholder={placeholder}
					disabled={disabled}
					rows={1}
					className="w-full resize-none bg-transparent text-body text-on-surface outline-none placeholder:text-on-surface-muted"
					style={{
						...textareaStyle,
						lineHeight: `${LINE_HEIGHT}px`,
						overflowX: 'hidden',
						wordBreak: 'break-word',
						overflowWrap: 'break-word',
						whiteSpace: 'pre-wrap',
					}}
				/>
			</div>

			{/* ── Horizontal: inline send button ──────────────────────── */}
			{isHorizontal && (
				<Button
					variant={canSend || isGenerating ? 'pill-active' : 'pill-secondary'}
					size="pill"
					aria-label={isGenerating ? 'Stop generation' : 'Send message'}
					onClick={handleSendClick}
					disabled={!isGenerating && !canSend}
					className="shrink-0 disabled:opacity-100"
				>
					{isGenerating ? <Square size={14} /> : <ArrowUp size={16} />}
				</Button>
			)}

			{/* ── BIG: absolute control strip pinned to bottom ────────── */}
			{isBig && (
				<div
					className="flex items-center justify-between"
					style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}
				>
					<PromptInputMenu
						open={menuOpen}
						onOpenChange={setMenuOpen}
						onAddItem={onAddContextItem}
						onUpdateItem={() => {}}
						promptAreaRef={promptAreaRef}
					/>
					<Button
						variant={canSend || isGenerating ? 'pill-active' : 'pill-secondary'}
						size="pill"
						aria-label={isGenerating ? 'Stop generation' : 'Send message'}
						onClick={handleSendClick}
						disabled={!isGenerating && !canSend}
						className="shrink-0 disabled:opacity-100"
					>
						{isGenerating ? <Square size={14} /> : <ArrowUp size={16} />}
					</Button>
				</div>
			)}
		</motion.div>
	)
}
