'use client'

// -- Lucide Icons --
import {
	AlertCircle,
	ArrowLeft,
	ArrowRight,
	Battery,
	Bell,
	Bookmark,
	Calendar,
	Camera,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Code,
	Copy,
	Cpu,
	Database,
	Download,
	Edit,
	ExternalLink,
	Eye,
	EyeOff,
	FileText,
	Film,
	Filter,
	Folder,
	GitBranch,
	Github,
	Globe,
	Grid,
	Headphones,
	Heart,
	Home,
	Image,
	Info,
	icons,
	Link,
	List,
	Loader2,
	Lock,
	type LucideIcon,
	Mail,
	MapPin,
	Maximize2,
	MessageCircle,
	Mic,
	Minimize2,
	Minus,
	Moon,
	MoreHorizontal,
	MoreVertical,
	Music,
	Pause,
	Phone,
	Play,
	Plus,
	RefreshCw,
	RotateCw,
	Save,
	Search,
	Send,
	Settings,
	Share2,
	SkipBack,
	SkipForward,
	SortAsc,
	SortDesc,
	Star,
	Sun,
	Tag,
	Terminal,
	Trash2,
	Unlock,
	Upload,
	User,
	Volume2,
	VolumeX,
	Wifi,
	X,
	Zap,
} from 'lucide-react'
import {
	Component,
	createElement,
	Fragment,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useRunner } from 'react-runner'
// -- UI Components --
import { Button } from '@/core/ui/button'
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/core/ui/context-menu'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from '@/core/ui/dialog'
import { Input } from '@/core/ui/input'
import { MenuCard, MenuCardItem } from '@/core/ui/menu-card'
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/core/ui/sheet'
import { Slider } from '@/core/ui/slider'
import { Switch } from '@/core/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/core/ui/tooltip'

// ---------------------------------------------------------------------------
// Types for postMessage protocol
// ---------------------------------------------------------------------------

type InitMessage = {
	type: 'init'
	code: string
	state: Record<string, unknown>
}

type CallMessage = {
	type: 'call'
	callId: string
	action: string
	params: Record<string, unknown>
}

type StateUpdateMessage = {
	type: 'stateUpdate'
	state: Record<string, unknown>
}

type InboundMessage = InitMessage | CallMessage | StateUpdateMessage

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

type ErrorBoundaryProps = {
	onError: (error: Error) => void
	children: ReactNode
	/** Key to reset the boundary when code changes */
	resetKey: string | number
}

type ErrorBoundaryState = {
	error: Error | null
}

class SandboxErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null }

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error }
	}

	componentDidCatch(error: Error) {
		this.props.onError(error)
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps) {
		// Reset error when code changes (new resetKey)
		if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
			this.setState({ error: null })
		}
	}

	render() {
		if (this.state.error) {
			return createElement(
				'div',
				{
					style: {
						padding: '16px',
						color: '#ef4444',
						fontFamily: 'monospace',
						fontSize: '13px',
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
					},
				},
				`Runtime Error: ${this.state.error.message}`,
			)
		}
		return this.props.children
	}
}

// ---------------------------------------------------------------------------
// useAppState — the bridge hook injected into generated code scope
// ---------------------------------------------------------------------------

function createUseAppState(
	stateRef: React.MutableRefObject<Record<string, unknown>>,
	listeners: Set<() => void>,
	postToHost: (msg: Record<string, unknown>) => void,
) {
	return function useAppState<T = Record<string, unknown>>(
		defaultState?: T,
	): [T, (updater: Partial<T> | ((prev: T) => Partial<T>)) => void] {
		// Merge defaultState into stateRef on first call (only fills missing keys)
		if (defaultState) {
			for (const [k, v] of Object.entries(defaultState as Record<string, unknown>)) {
				if (!(k in stateRef.current)) {
					stateRef.current[k] = v
				}
			}
		}

		const [, forceRender] = useState(0)

		useEffect(() => {
			const listener = () => forceRender((n) => n + 1)
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		}, [])

		const setState = useCallback((updater: Partial<T> | ((prev: T) => Partial<T>)) => {
			const patch =
				typeof updater === 'function'
					? (updater as (prev: T) => Partial<T>)(stateRef.current as T)
					: updater

			Object.assign(stateRef.current, patch)

			// Notify all subscribers (re-render components using useAppState)
			for (const listener of listeners) {
				listener()
			}

			// Sync to host for persistence
			postToHost({ type: 'stateSync', state: { ...stateRef.current } })
		}, [])

		return [stateRef.current as T, setState]
	}
}

// ---------------------------------------------------------------------------
// Scope — everything the generated code can use without imports
// ---------------------------------------------------------------------------

const commonIcons: Record<string, LucideIcon> = {
	Plus,
	Minus,
	Check,
	X,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	ChevronDown,
	Search,
	Settings,
	Trash2,
	Edit,
	Copy,
	Save,
	Download,
	Upload,
	RefreshCw,
	ArrowLeft,
	ArrowRight,
	Heart,
	Star,
	Home,
	User,
	Mail,
	Phone,
	Calendar,
	Clock,
	MapPin,
	AlertCircle,
	Info,
	Play,
	Pause,
	SkipForward,
	SkipBack,
	Volume2,
	VolumeX,
	Sun,
	Moon,
	Eye,
	EyeOff,
	Lock,
	Unlock,
	Loader2,
	MoreHorizontal,
	MoreVertical,
	ExternalLink,
	Link,
	Image,
	FileText,
	Folder,
	Tag,
	Filter,
	SortAsc,
	SortDesc,
	Grid,
	List,
	Maximize2,
	Minimize2,
	RotateCw,
	Zap,
	Globe,
	Bookmark,
	Bell,
	MessageCircle,
	Send,
	Share2,
	Mic,
	Camera,
	Film,
	Music,
	Headphones,
	Wifi,
	Battery,
	Cpu,
	Database,
	Terminal,
	Code,
	GitBranch,
	Github,
}

// ---------------------------------------------------------------------------
// Tailwind safelist — classes that generated apps may use at runtime.
// Tailwind v4 compiles only classes found in source files at build time.
// Generated code arrives via postMessage, so we reference common utilities
// here to ensure they're compiled into the CSS output.
// ---------------------------------------------------------------------------

const TAILWIND_SAFELIST = [
	// Grid
	'grid grid-cols-1 grid-cols-2 grid-cols-3 grid-cols-4 grid-cols-5 grid-cols-6',
	'grid-rows-1 grid-rows-2 grid-rows-3 grid-rows-4 grid-rows-5 grid-rows-6',
	'col-span-1 col-span-2 col-span-3 col-span-4 col-span-full',
	'row-span-1 row-span-2 row-span-3 row-span-full',
	'auto-rows-fr auto-rows-min auto-rows-max auto-cols-fr auto-cols-min auto-cols-max',
	// Flex
	'flex flex-col flex-row flex-wrap flex-1 flex-none flex-auto shrink-0 grow',
	'items-start items-center items-end items-stretch items-baseline',
	'justify-start justify-center justify-end justify-between justify-around justify-evenly',
	'self-start self-center self-end self-stretch',
	// Gap
	'gap-0 gap-0.5 gap-1 gap-1.5 gap-2 gap-3 gap-4 gap-5 gap-6 gap-8 gap-10 gap-12',
	'gap-x-1 gap-x-2 gap-x-3 gap-x-4 gap-y-1 gap-y-2 gap-y-3 gap-y-4',
	// Padding
	'p-0 p-1 p-1.5 p-2 p-3 p-4 p-5 p-6 p-8 p-10 p-12',
	'px-0 px-1 px-2 px-3 px-4 px-5 px-6 px-8',
	'py-0 py-1 py-2 py-3 py-4 py-5 py-6 py-8',
	'pt-0 pt-1 pt-2 pt-3 pt-4 pt-5 pt-6 pt-8 pt-10 pt-12',
	'pb-0 pb-1 pb-2 pb-3 pb-4 pb-5 pb-6 pb-8',
	'pl-0 pl-1 pl-2 pl-3 pl-4 pr-0 pr-1 pr-2 pr-3 pr-4',
	// Margin
	'm-0 m-1 m-2 m-3 m-4 m-auto',
	'mx-0 mx-1 mx-2 mx-3 mx-4 mx-auto',
	'my-0 my-1 my-2 my-3 my-4 my-auto',
	'mt-0 mt-1 mt-2 mt-3 mt-4 mt-6 mt-8',
	'mb-0 mb-1 mb-2 mb-3 mb-4 mb-6 mb-8',
	'ml-0 ml-1 ml-2 ml-3 ml-4 mr-0 mr-1 mr-2 mr-3 mr-4',
	'-mt-1 -mt-2 -mb-1 -mb-2',
	// Width & Height
	'w-full w-auto w-fit w-screen w-1/2 w-1/3 w-2/3 w-1/4 w-3/4',
	'w-4 w-5 w-6 w-8 w-10 w-12 w-16 w-20 w-24 w-32 w-40 w-48 w-56 w-64',
	'min-w-0 min-w-full max-w-xs max-w-sm max-w-md max-w-lg max-w-xl max-w-full',
	'h-full h-auto h-fit h-screen h-1/2 h-1/3 h-2/3',
	'h-3 h-4 h-5 h-6 h-8 h-9 h-10 h-12 h-16 h-20 h-24 h-32 h-40 h-48',
	'min-h-0 min-h-full min-h-screen max-h-full max-h-screen max-h-96 max-h-64',
	'size-3 size-4 size-5 size-6 size-8 size-10 size-12',
	// Typography (beyond what host already uses)
	'text-xs text-sm text-base text-lg text-xl text-2xl text-3xl text-4xl text-5xl',
	'font-normal font-medium font-semibold font-bold font-mono',
	'tracking-tight tracking-normal tracking-wide',
	'leading-none leading-tight leading-snug leading-normal leading-relaxed',
	'text-left text-center text-right',
	'truncate line-clamp-1 line-clamp-2 line-clamp-3',
	'uppercase lowercase capitalize',
	'whitespace-nowrap whitespace-pre-wrap break-words',
	'underline no-underline',
	// Surfaces (Domus tokens — many already in host but be thorough)
	'bg-surface-lowest bg-surface-low bg-surface-bright bg-surface bg-surface-high bg-surface-highest bg-surface-dim',
	'text-on-surface text-on-surface-muted',
	'border-outline border-outline-variant',
	'bg-primary text-primary text-on-primary bg-primary-container text-on-primary-container',
	'bg-secondary-container text-on-secondary-container',
	'bg-tertiary-container text-on-tertiary-container',
	'text-error bg-error-container text-on-error-container',
	'bg-agent-container text-on-agent-container',
	// Opacity variants for hover states
	'bg-on-surface/5 bg-on-surface/8 bg-on-surface/10 bg-on-surface/15',
	'hover:bg-on-surface/5 hover:bg-on-surface/8 hover:bg-on-surface/10',
	'bg-primary/80 bg-primary/90 hover:bg-primary/80 hover:bg-primary/90',
	// Borders
	'border border-0 border-2 border-t border-b border-l border-r',
	'rounded-none rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-full',
	// Shadows (Domus tokens)
	'shadow-card shadow-resting shadow-window shadow-elevated shadow-overlay',
	// Position & overflow
	'relative absolute fixed sticky',
	'inset-0 top-0 right-0 bottom-0 left-0',
	'top-1 top-2 top-3 top-4 right-1 right-2 right-3 right-4',
	'bottom-1 bottom-2 bottom-3 bottom-4 left-1 left-2 left-3 left-4',
	'z-0 z-10 z-20 z-30 z-40 z-50',
	'overflow-auto overflow-hidden overflow-scroll overflow-x-auto overflow-y-auto',
	// Display
	'block inline-block inline hidden',
	// Transitions
	'transition-all transition-colors transition-opacity transition-transform',
	'duration-150 duration-200 duration-300',
	// Opacity
	'opacity-0 opacity-25 opacity-50 opacity-75 opacity-100',
	// Cursor
	'cursor-pointer cursor-default cursor-not-allowed',
	// Pointer events
	'pointer-events-none pointer-events-auto',
	// Misc
	'select-none select-all',
	'ring-1 ring-2 ring-primary/20 ring-outline-variant',
	'divide-y divide-x divide-outline-variant',
	'aspect-square aspect-video',
	'object-cover object-contain object-center',
	'animate-spin animate-pulse',
	'tabular-nums',
].join(' ')

// ---------------------------------------------------------------------------
// Sandbox Page Component
// ---------------------------------------------------------------------------

export default function SandboxPage() {
	const [code, setCode] = useState<string | null>(null)
	const [renderKey, setRenderKey] = useState(0)

	// Shared mutable state ref (source of truth for useAppState)
	const stateRef = useRef<Record<string, unknown>>({})
	const listenersRef = useRef(new Set<() => void>())

	const postToHost = useCallback((msg: Record<string, unknown>) => {
		try {
			window.parent.postMessage(msg, '*')
		} catch {
			// Silently ignore if postMessage fails (e.g. sandbox restrictions)
		}
	}, [])

	// Create the useAppState hook bound to our refs
	const useAppState = useMemo(
		() => createUseAppState(stateRef, listenersRef.current, postToHost),
		[postToHost],
	)

	// Build scope for react-runner
	const scope = useMemo(
		() => ({
			// React hooks & utilities (react-runner provides React/useState/etc by default,
			// but we also expose useAppState and common hooks explicitly)
			useAppState,
			useState,
			useEffect,
			useCallback,
			useMemo,
			useRef,
			Fragment,

			// UI Components
			Button,
			Input,
			Slider,
			Switch,
			Dialog,
			DialogClose,
			DialogContent,
			DialogDescription,
			DialogFooter,
			DialogHeader,
			DialogOverlay,
			DialogPortal,
			DialogTitle,
			DialogTrigger,
			Tooltip,
			TooltipContent,
			TooltipProvider,
			TooltipTrigger,
			Sheet,
			SheetClose,
			SheetContent,
			SheetDescription,
			SheetFooter,
			SheetHeader,
			SheetTitle,
			SheetTrigger,
			ContextMenu,
			ContextMenuCheckboxItem,
			ContextMenuContent,
			ContextMenuGroup,
			ContextMenuItem,
			ContextMenuLabel,
			ContextMenuPortal,
			ContextMenuRadioGroup,
			ContextMenuRadioItem,
			ContextMenuSeparator,
			ContextMenuShortcut,
			ContextMenuSub,
			ContextMenuSubContent,
			ContextMenuSubTrigger,
			ContextMenuTrigger,
			MenuCard,
			MenuCardItem,

			// Commonly used icons (direct access)
			...commonIcons,

			// Full icon map for dynamic lookup
			icons,
		}),
		[useAppState],
	)

	// Handle inbound messages
	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			const data = event.data as InboundMessage
			if (!data || typeof data !== 'object' || !data.type) return

			switch (data.type) {
				case 'init': {
					// Set initial state from host
					if (data.state && typeof data.state === 'object') {
						stateRef.current = { ...data.state }
					} else {
						stateRef.current = {}
					}

					// Notify existing state listeners (re-render useAppState consumers)
					for (const listener of listenersRef.current) {
						listener()
					}

					// Load the code — triggers re-render with new code
					setCode(data.code)
					setRenderKey((k) => k + 1)
					break
				}

				case 'stateUpdate': {
					// Host pushed new state (e.g. agent wrote state directly)
					if (data.state && typeof data.state === 'object') {
						Object.assign(stateRef.current, data.state)
						for (const listener of listenersRef.current) {
							listener()
						}
					}
					break
				}

				case 'call': {
					// Agent tool call — basic structure for stretch goal
					// For now, acknowledge with a callResult
					postToHost({
						type: 'callResult',
						callId: data.callId,
						result: { ok: true, message: 'call handler not implemented' },
					})
					break
				}
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [postToHost])

	// Signal readiness to host on mount
	useEffect(() => {
		postToHost({ type: 'ready' })
	}, [postToHost])

	// Don't render anything until we receive code
	if (!code) {
		return null
	}

	return (
		<div className="h-full w-full overflow-auto">
			{/* Safelist: Tailwind v4 only compiles classes found in source files.
			    Generated app code arrives at runtime via postMessage, so its classes
			    would be missing. This hidden div references commonly-needed utilities
			    so Tailwind includes them in the CSS output. */}
			<div hidden className={TAILWIND_SAFELIST} />
			<SandboxErrorBoundary
				resetKey={renderKey}
				onError={(error) => {
					postToHost({
						type: 'error',
						message: error.message,
						stack: error.stack,
					})
				}}
			>
				<SandboxRunner
					code={code}
					scope={scope}
					onError={(errorMsg) => {
						postToHost({
							type: 'error',
							message: errorMsg,
						})
					}}
				/>
			</SandboxErrorBoundary>
		</div>
	)
}

// ---------------------------------------------------------------------------
// SandboxRunner — uses react-runner's useRunner hook
// ---------------------------------------------------------------------------

function SandboxRunner({
	code,
	scope,
	onError,
}: {
	code: string
	scope: Record<string, unknown>
	onError: (message: string) => void
}) {
	const { element, error } = useRunner({ code, scope })

	// Report compilation/transform errors to host
	useEffect(() => {
		if (error) {
			onError(error)
		}
	}, [error, onError])

	if (error) {
		return (
			<div
				style={{
					padding: '16px',
					color: '#ef4444',
					fontFamily: 'monospace',
					fontSize: '13px',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				}}
			>
				{`Compile Error: ${error}`}
			</div>
		)
	}

	return element
}
