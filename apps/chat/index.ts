import { MessageSquare } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { BuiltInApp, ToolSchema } from '@/apps/_types'
import { type ChatAppState, DEFAULT_CHAT_STATE } from '@/apps/chat/types'

const ChatApp = dynamic(() => import('@/apps/chat/ChatApp'))
const ChatWindowActions = dynamic(() => import('@/apps/chat/ChatWindowActions'))

function reduce(
	state: Record<string, unknown>,
	action: string,
	params: unknown,
): Record<string, unknown> {
	const chat = (
		state.active_group_id !== undefined ? state : { ...DEFAULT_CHAT_STATE }
	) as ChatAppState
	const p = params as Record<string, unknown>

	switch (action) {
		case 'set_active_group':
			return { ...chat, active_group_id: (p.group_id as string) ?? null }
		case 'set_sidebar':
			return { ...chat, sidebar: (p.sidebar as ChatAppState['sidebar']) ?? null }
		default:
			return state
	}
}

function getSchema(_state: Record<string, unknown>): ToolSchema[] {
	return [
		{
			name: 'list_groups',
			description: 'List all chat groups the user is a member of',
			inputSchema: { type: 'object', properties: {} },
		},
		{
			name: 'list_messages',
			description: 'List recent messages in a chat group',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID' },
					limit: { type: 'number', description: 'Max messages to return (default 50)' },
					before_id: { type: 'string', description: 'Return messages before this message ID' },
				},
				required: ['group_id'],
			},
		},
		{
			name: 'get_group_summary',
			description: 'Get a summary of recent activity in a chat group (last 50 messages)',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID' },
					limit: { type: 'number', description: 'Max messages to include (default 50)' },
				},
				required: ['group_id'],
			},
		},
		{
			name: 'search_messages',
			description: 'Search for messages by content across all groups or within a specific group',
			inputSchema: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'Text to search for (case-insensitive)' },
					group_id: { type: 'string', description: 'Limit search to this group (optional)' },
				},
				required: ['query'],
			},
		},
		{
			name: 'set_active_group',
			description: 'Navigate to a specific chat group in the UI',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID to navigate to' },
				},
				required: ['group_id'],
			},
		},
		{
			name: 'send_message',
			description: 'Send a text message to a chat group',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID' },
					content: { type: 'string', description: 'The message text to send' },
				},
				required: ['group_id', 'content'],
			},
		},
		{
			name: 'delete_group',
			description: 'Delete a chat group (must be the group owner)',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID to delete' },
				},
				required: ['group_id'],
			},
		},
		{
			name: 'create_group',
			description: 'Create a new chat group and become its owner',
			inputSchema: {
				type: 'object',
				properties: {
					name: { type: 'string', description: 'Display name for the group' },
				},
				required: ['name'],
			},
		},
		{
			name: 'send_image',
			description: 'Send an image to a chat group by fetching it from a URL',
			inputSchema: {
				type: 'object',
				properties: {
					group_id: { type: 'string', description: 'The chat group ID' },
					image_url: { type: 'string', description: 'Public URL of the image to send' },
				},
				required: ['group_id', 'image_url'],
			},
		},
	]
}

function summarize(state: Record<string, unknown>): string {
	const chat = (state.active_group_id !== undefined ? state : DEFAULT_CHAT_STATE) as ChatAppState
	if (!chat.active_group_id) return 'Chat'
	// The group name isn't in entity state — just show "Chat" with group indicator
	return 'Chat — active'
}

export const chatApp: BuiltInApp = {
	source: 'built-in',
	type: 'chat',
	name: 'Chat',
	description: 'Messaging interface for direct messages and group conversations.',
	icon: MessageSquare,
	component: ChatApp,
	windowActions: ChatWindowActions,
	defaultPresentation: 'window',
	defaultSize: { width: 400, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
	summarizeOn: ['set_active_group', 'send_message'],
	getSchema,
}
