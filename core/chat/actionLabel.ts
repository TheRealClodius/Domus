const TOOL_LABELS: Record<string, { pending: string; done: string }> = {
	create_entity: { pending: 'Creating entity', done: 'Created' },
	update_entity: { pending: 'Updating entity', done: 'Updated' },
	query_entities: { pending: 'Searching', done: 'Found results' },
	read_entity: { pending: 'Reading entity', done: 'Read' },
	web_search: { pending: 'Searching the web', done: 'Found results' },
}

export function getActionLabel(
	tool: string,
	status: 'pending' | 'done',
	result?: Record<string, unknown> | null,
	args?: Record<string, unknown>,
): string {
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
