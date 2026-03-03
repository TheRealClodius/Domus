import { Check, Loader2 } from 'lucide-react'

const TOOL_LABELS: Record<string, { pending: string; done: string }> = {
	create_entity: { pending: 'Creating entity', done: 'Created' },
	update_entity: { pending: 'Updating entity', done: 'Updated' },
	query_entities: { pending: 'Searching', done: 'Found results' },
	read_entity: { pending: 'Reading entity', done: 'Read' },
	web_search: { pending: 'Searching the web', done: 'Found results' },
}

function getLabel(
	tool: string,
	status: 'pending' | 'done',
	result?: Record<string, unknown> | null,
	args?: Record<string, unknown>,
) {
	if (status === 'pending') {
		if (args?.type === 'image') return 'Generating image...'
		if (tool === 'create_entity' && args?.type) return `Creating ${args.type as string}…`
		const query = args?.query as string | undefined
		if (tool === 'query_entities' && query && query.length <= 30) return `Searching for "${query}"…`
		if (tool === 'web_search' && query && query.length <= 30) return `Searching "${query}"…`
	}
	const labels = TOOL_LABELS[tool] ?? {
		pending: `Running ${tool.replace(/_/g, ' ')}`,
		done: tool.replace(/_/g, ' '),
	}
	if (status === 'pending') return `${labels.pending}...`
	const summary = result?.summary as string | undefined
	if (summary) return `${labels.done} "${summary}"`
	return labels.done
}

interface ActionChipProps {
	tool: string
	status: 'pending' | 'done'
	result?: Record<string, unknown> | null
	args?: Record<string, unknown>
	onFocusEntity?: (entityId: string) => void
}

export default function ActionChip({ tool, status, result, args, onFocusEntity }: ActionChipProps) {
	const label = getLabel(tool, status, result, args)
	const entityId = result?.id as string | undefined
	const canClick = status === 'done' && entityId && onFocusEntity

	const content = (
		<div className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-label text-on-surface-muted">
			{status === 'pending' ? (
				<Loader2 data-testid="action-chip-spinner" size={14} className="animate-spin" />
			) : (
				<Check data-testid="action-chip-check" size={14} className="text-agent" />
			)}
			<span>{label}</span>
		</div>
	)

	if (canClick) {
		return (
			<button
				type="button"
				onClick={() => onFocusEntity(entityId)}
				aria-label={`Focus ${label}`}
				className="text-left"
			>
				{content}
			</button>
		)
	}

	return content
}
