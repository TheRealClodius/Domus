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
