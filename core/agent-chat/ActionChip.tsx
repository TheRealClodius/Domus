import { Check, Loader2 } from 'lucide-react'
import { getActionLabel } from '@/core/agent-chat/actionLabel'

interface ActionChipProps {
	tool: string
	status: 'pending' | 'done'
	result?: Record<string, unknown> | null
	args?: Record<string, unknown>
	onFocusEntity?: (entityId: string) => void
}

export default function ActionChip({ tool, status, result, args, onFocusEntity }: ActionChipProps) {
	const label = getActionLabel(tool, status, result, args)
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
