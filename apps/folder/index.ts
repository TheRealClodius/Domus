import { Folder } from 'lucide-react'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'

function getSchema(state: Record<string, unknown>): ToolSchema[] {
	const childIds = (state.child_ids as string[] | undefined) ?? []
	const tools: ToolSchema[] = [
		{
			name: 'add_children',
			description: 'Add one or more entities to this folder',
			inputSchema: {
				type: 'object',
				properties: {
					child_ids: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1,
						description: 'IDs of entities to add to the folder',
					},
				},
				required: ['child_ids'],
			},
		},
	]

	if (childIds.length > 0) {
		tools.push({
			name: 'remove_child',
			description: 'Remove a single entity from this folder and place it back on the canvas',
			inputSchema: {
				type: 'object',
				properties: {
					child_id: {
						type: 'string',
						description: 'ID of the entity to remove from the folder',
					},
				},
				required: ['child_id'],
			},
		})
	}

	tools.push({
		name: 'scatter',
		description: 'Dissolve this folder and return all children to the canvas',
		inputSchema: {
			type: 'object',
			properties: {},
		},
	})

	return tools
}

export function reduce(
	state: Record<string, unknown>,
	action: string,
	params: unknown,
): Record<string, unknown> {
	const p = params as Record<string, unknown>
	const currentIds = (state.child_ids as string[] | undefined) ?? []

	switch (action) {
		case 'add_children': {
			const newIds = (p.child_ids as string[]) ?? []
			const merged = [...new Set([...currentIds, ...newIds])]
			return { ...state, child_ids: merged }
		}
		case 'remove_child': {
			const removeId = p.child_id as string
			return { ...state, child_ids: currentIds.filter((id) => id !== removeId) }
		}
		case 'scatter':
			return { ...state, child_ids: [] }
		default:
			return state
	}
}

export function summarize(state: Record<string, unknown>): string {
	const childIds = (state.child_ids as string[] | undefined) ?? []
	if (childIds.length === 0) return 'Empty folder'
	if (childIds.length === 1) return '1 item'
	return `${childIds.length} items`
}

export const folderApp: BuiltInApp = {
	source: 'built-in',
	type: 'folder',
	name: 'Folder',
	description:
		'Canvas grouping that holds multiple entities. Use call_entity_tool to manage children (add_children, remove_child, scatter). Do not write child_ids directly via update_entity.',
	icon: Folder,
	// Folders are rendered by the canvas; this component is never mounted
	component: () => null,
	defaultPresentation: 'folder',
	defaultSize: { width: 120, height: 120 },
	initialState: { child_ids: [] },
	reduce,
	summarize,
	getSchema,
}
