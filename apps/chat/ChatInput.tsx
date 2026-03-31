'use client'

import { ArrowUp, Paperclip, X } from 'lucide-react'
import { motion } from 'motion/react'
import Image from 'next/image'
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TEXTAREA_MAX, TEXTAREA_MIN, useAutoResize } from '@/core/chat/useAutoResize'
import { usePromptInputDrop } from '@/core/chat/usePromptInputDrop'
import { Button } from '@/core/ui/button'
import { DURATION, MOTION_EASE, SPRING } from '@/lib/motion'
import { textFitsInHeight } from '@/lib/textMeasure'
import { cn } from '@/lib/utils'

// ── Layout constants (mirrors PromptInput) ──────────────────────────

type Layout = 'IDLE' | 'CLICKED' | 'BIG'

const IDLE_WIDTH = 280
const CLICKED_WIDTH = 350
const COMPACT_HEIGHT = 51 // 35px textarea + 16px container padding
const LINE_HEIGHT = 23
const TEXTAREA_CLICKED = 35

const INNER_GAP = 8
const BUTTON_HEIGHT = 32
const CONTAINER_PADDING = 16 // 8px × 2
const PREVIEW_HEIGHT = 56 // thumbnail row height
const PREVIEW_GAP = 8

const OUTLINE_SLIM = 1
const OUTLINE_FOCUS = 8
const CONTAINER_RADIUS = 20

// ── Component ───────────────────────────────────────────────────────

interface ChatInputProps {
	onSend: (text: string, file?: File) => void
	onTyping?: () => void
	disabled?: boolean
	placeholder?: string
}

export default function ChatInput({
	onSend,
	onTyping,
	disabled = false,
	placeholder = 'Type a message...',
}: ChatInputProps) {
	const [layout, setLayout] = useState<Layout>('IDLE')
	const [text, setText] = useState('')
	const [pendingFile, setPendingFile] = useState<File | null>(null)
	const [isComposing, setIsComposing] = useState(false)
	const [textareaFocused, setTextareaFocused] = useState(false)
	const [topGradientOpacity, setTopGradientOpacity] = useState(0)
	const [bottomGradientOpacity, setBottomGradientOpacity] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const justTransitionedToBigRef = useRef(false)
	const { measuredHeight, measure } = useAutoResize(textareaRef)

	// ── Drag-and-drop ───────────────────────────────────────────────

	const { isDragOver, dropHandlers } = usePromptInputDrop({
		onFilesAccepted: (files) => {
			if (files.length > 0) setPendingFile(files[0])
		},
		maxItems: 1,
		currentCount: pendingFile ? 1 : 0,
	})

	const hasText = text.trim() !== ''
	const hasContent = hasText || pendingFile !== null
	const canSend = hasContent && !disabled

	const previewUrl = useMemo(() => {
		if (!pendingFile || !pendingFile.type.startsWith('image/')) return null
		return URL.createObjectURL(pendingFile)
	}, [pendingFile])

	// Revoke object URL on cleanup
	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl)
		}
	}, [previewUrl])

	// ── Layout state machine (OS1-matched) ──────────────────────────

	useEffect(() => {
		const textarea = textareaRef.current
		if (!textarea) return

		const textPresent = text.trim() !== ''
		const hasFile = pendingFile !== null

		// File attached → always BIG (need preview space)
		if (hasFile && layout !== 'BIG') {
			setLayout('BIG')
			return
		}

		// Drag enters → jump to BIG to show drop zone
		if (isDragOver && layout !== 'BIG') {
			setLayout('BIG')
			return
		}

		// BIG → shrink: content fully cleared (and not dragging)
		if (layout === 'BIG' && !textPresent && !hasFile && !isDragOver) {
			setLayout(textareaFocused ? 'CLICKED' : 'IDLE')
			return
		}

		if (layout === 'IDLE') return

		if (layout === 'CLICKED') {
			// CLICKED → BIG: text overflows (+2px buffer)
			if (textarea.scrollHeight > textarea.clientHeight + 2) {
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
		if (hasFile) return // Stay BIG while file is attached
		if (isDragOver) return // Stay BIG while dragging over

		// BIG → CLICKED: text fits in CLICKED height
		const contentWidth = textarea.clientWidth - 12 // 6px padding each side
		const wouldFit = textFitsInHeight(text, contentWidth, TEXTAREA_CLICKED + 2, 12)
		if (wouldFit) {
			setLayout('CLICKED')
		}
	}, [layout, text, pendingFile, textareaFocused, isDragOver])

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
			setText(value)
			onTyping?.()
			requestAnimationFrame(() => measure())
		},
		[onTyping, measure],
	)

	const handleClick = useCallback(() => {
		if (layout === 'IDLE') {
			setLayout('CLICKED')
		}
		textareaRef.current?.focus()
	}, [layout])

	const handleTextareaFocus = useCallback(() => {
		setTextareaFocused(true)
	}, [])

	const handleTextareaBlur = useCallback(() => {
		setTextareaFocused(false)
		if (!text.trim() && !pendingFile) {
			setLayout('IDLE')
		}
	}, [text, pendingFile])

	const submit = useCallback(() => {
		const trimmed = text.trim()
		if (!trimmed && !pendingFile) return
		if (pendingFile) {
			onSend(trimmed, pendingFile)
		} else {
			onSend(trimmed)
		}
		setText('')
		setPendingFile(null)
		requestAnimationFrame(() => measure())
	}, [onSend, measure, pendingFile, text])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
				e.preventDefault()
				if (canSend) {
					submit()
				}
			}
		},
		[isComposing, canSend, submit],
	)

	const handleAttachClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		fileInputRef.current?.click()
	}, [])

	const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			setPendingFile(file)
		}
		// Reset so the same file can be re-selected
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [])

	const handleRemoveFile = useCallback(() => {
		setPendingFile(null)
	}, [])

	// ── Animation targets ───────────────────────────────────────────

	const isBig = layout === 'BIG'
	const isIdle = layout === 'IDLE'
	const isHorizontal = !isBig

	const targetWidth = isIdle ? IDLE_WIDTH : CLICKED_WIDTH
	let targetHeight = COMPACT_HEIGHT
	if (isBig) {
		const textareaH = Math.max(TEXTAREA_MIN, Math.min(TEXTAREA_MAX, measuredHeight))
		const previewH = pendingFile ? PREVIEW_HEIGHT + PREVIEW_GAP : 0
		targetHeight = previewH + textareaH + INNER_GAP + BUTTON_HEIGHT + CONTAINER_PADDING
	}

	const transition =
		isIdle || layout === 'CLICKED'
			? { width: SPRING.prompt, height: SPRING.prompt }
			: {
					width: { duration: DURATION.medium, ease: MOTION_EASE.out },
					height: { duration: DURATION.hover, ease: MOTION_EASE.out },
				}

	const outlineStyle = isDragOver
		? `${OUTLINE_FOCUS}px solid color-mix(in oklch, var(--primary) 40%, transparent)`
		: textareaFocused
			? `${OUTLINE_FOCUS}px solid color-mix(in oklch, var(--primary) 25%, transparent)`
			: `${OUTLINE_SLIM}px solid color-mix(in oklch, var(--outline-variant) 50%, transparent)`

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

	// ── Render ──────────────────────────────────────────────────────

	return (
		<div className="flex justify-center px-1 py-2">
			{/* Hidden file input — tabIndex -1 keeps it out of tab order */}
			<input
				ref={fileInputRef}
				type="file"
				tabIndex={-1}
				className="absolute size-0 overflow-hidden opacity-0"
				accept="image/*,application/pdf"
				onChange={handleFileChange}
			/>

			<motion.div
				ref={containerRef}
				animate={{ width: targetWidth, height: targetHeight }}
				transition={transition}
				onClick={handleClick}
				onDragEnter={dropHandlers.onDragEnter as unknown as React.DragEventHandler}
				onDragOver={dropHandlers.onDragOver as unknown as React.DragEventHandler}
				onDragLeave={dropHandlers.onDragLeave as unknown as React.DragEventHandler}
				onDrop={dropHandlers.onDrop as unknown as React.DragEventHandler}
				className={cn(
					'relative overflow-hidden bg-surface',
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
				{/* ── Horizontal: inline attach button ────────────────────── */}
				{isHorizontal && (
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Attach file"
						className="shrink-0"
						onClick={handleAttachClick}
					>
						<Paperclip size={16} />
					</Button>
				)}

				{/* ── File preview (BIG only) ────────────────────────────── */}
				{isBig && pendingFile && (
					<div className="flex items-center gap-2">
						<div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-surface">
							{previewUrl ? (
								<Image
									src={previewUrl}
									alt={pendingFile.name}
									fill
									className="object-cover"
									unoptimized
								/>
							) : (
								<div className="flex items-center justify-center size-full text-label text-on-surface-muted uppercase">
									{pendingFile.name.split('.').pop()?.slice(0, 4)}
								</div>
							)}
							<button
								type="button"
								onClick={handleRemoveFile}
								className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
							>
								<X className="size-4 text-white" />
							</button>
						</div>
						<span className="text-label text-on-surface-muted truncate min-w-0">
							{pendingFile.name}
						</span>
					</div>
				)}

				{/* ── Textarea wrapper ────────────────────────────────────── */}
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

					{/* TODO: replace with DS Textarea when core/ui/textarea is added */}
					<textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => handleTextChange(e.target.value)}
						onKeyDown={handleKeyDown}
						onFocus={handleTextareaFocus}
						onBlur={handleTextareaBlur}
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
						variant={canSend ? 'pill-active' : 'pill-secondary'}
						size="pill"
						aria-label="Send message"
						onMouseDown={(e) => e.preventDefault()}
						onClick={submit}
						disabled={!canSend}
						className="shrink-0 disabled:opacity-100"
					>
						<ArrowUp size={16} />
					</Button>
				)}

				{/* ── BIG: control strip pinned to bottom ────────────────── */}
				{isBig && (
					<div
						className="flex items-center justify-between"
						style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}
					>
						<Button
							variant="pill-secondary"
							size="pill"
							aria-label="Attach file"
							className="shrink-0"
							onClick={handleAttachClick}
						>
							<Paperclip size={16} />
						</Button>
						<Button
							variant={canSend ? 'pill-active' : 'pill-secondary'}
							size="pill"
							aria-label="Send message"
							onMouseDown={(e) => e.preventDefault()}
							onClick={submit}
							disabled={!canSend}
							className="shrink-0 disabled:opacity-100"
						>
							<ArrowUp size={16} />
						</Button>
					</div>
				)}
			</motion.div>
		</div>
	)
}
