import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatGroup, ChatMessage } from '@/apps/chat/types'

const PAGE_SIZE = 50

export async function fetchGroups(supabase: SupabaseClient): Promise<ChatGroup[]> {
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) return []

	const { data: memberships, error: memberError } = await supabase
		.from('chat_members')
		.select('group_id')
		.eq('user_id', user.id)

	if (memberError) throw new Error(memberError.message)
	if (!memberships || memberships.length === 0) return []

	const groupIds = memberships.map((m: { group_id: string }) => m.group_id)

	const { data: groups, error: groupError } = await supabase
		.from('chat_groups')
		.select('*')
		.in('id', groupIds)
		.order('created_at', { ascending: false })

	if (groupError) throw new Error(groupError.message)
	return (groups ?? []) as ChatGroup[]
}

export async function fetchMessages(
	supabase: SupabaseClient,
	groupId: string,
	before?: string,
): Promise<ChatMessage[]> {
	let query = supabase.from('chat_messages').select('*').eq('group_id', groupId)

	if (before) {
		query = query.lt('created_at', before)
	}

	const { data, error } = await query.order('created_at', { ascending: false }).limit(PAGE_SIZE)

	if (error) throw new Error(error.message)

	return ((data ?? []) as Array<Omit<ChatMessage, 'status'>>).map((m) => ({
		...m,
		status: 'sent' as const,
	}))
}

export async function sendMessage(
	supabase: SupabaseClient,
	params: {
		group_id: string
		user_id: string
		content: string
		media_url?: string
		media_type?: string
	},
): Promise<ChatMessage> {
	const { data, error } = await supabase
		.from('chat_messages')
		.insert({
			group_id: params.group_id,
			user_id: params.user_id,
			content: params.content,
			media_url: params.media_url ?? null,
			media_type: params.media_type ?? null,
		})
		.select()
		.single()

	if (error) throw new Error(error.message)
	return { ...(data as Omit<ChatMessage, 'status'>), status: 'sent' }
}

export async function createGroup(supabase: SupabaseClient, name: string): Promise<ChatGroup> {
	const { data, error } = await supabase.rpc('create_chat_group', { p_name: name }).single()

	if (error) throw new Error(error.message)
	return data as ChatGroup
}

export async function joinGroup(supabase: SupabaseClient, inviteCode: string): Promise<ChatGroup> {
	const { data: group, error } = await supabase.rpc('join_group_via_invite', {
		p_invite_code: inviteCode,
	})

	if (error || !group) throw new Error(error?.message ?? 'Group not found')
	return group as ChatGroup
}

export async function updateLastRead(
	supabase: SupabaseClient,
	groupId: string,
	userId: string,
): Promise<void> {
	const { error } = await supabase
		.from('chat_members')
		.update({ last_read_at: new Date().toISOString() })
		.eq('group_id', groupId)
		.eq('user_id', userId)

	if (error) throw new Error(error.message)
}
