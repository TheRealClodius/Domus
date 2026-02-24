import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatUserProfile } from '@/apps/chat/chatStore'
import type { ChatGroup, ChatMessage, ChatUserSearchResult } from '@/apps/chat/types'

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

export async function fetchUserProfiles(
	supabase: SupabaseClient,
	userIds: string[],
): Promise<Record<string, ChatUserProfile>> {
	if (userIds.length === 0) return {}
	const { data } = await supabase
		.from('users')
		.select('id, name, username, avatar_url')
		.in('id', userIds)
	if (!data) return {}
	return Object.fromEntries(
		data.map(
			(u: { id: string; name: string | null; username: string; avatar_url: string | null }) => [
				u.id,
				{ name: u.name, username: u.username, avatar_url: u.avatar_url },
			],
		),
	)
}

export async function sendMessage(
	supabase: SupabaseClient,
	params: {
		group_id: string
		user_id: string
		content: string
		media_path?: string
		media_type?: string
	},
): Promise<ChatMessage> {
	const { data, error } = await supabase
		.from('chat_messages')
		.insert({
			group_id: params.group_id,
			user_id: params.user_id,
			content: params.content,
			media_path: params.media_path ?? null,
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

export async function searchUsers(query: string): Promise<ChatUserSearchResult[]> {
	const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(query)}&limit=10`)
	if (!res.ok) return []
	const json = await res.json()
	return json.users ?? []
}

export async function findOrCreateDM(
	supabase: SupabaseClient,
	otherUserId: string,
): Promise<ChatGroup> {
	const { data, error } = await supabase
		.rpc('find_or_create_dm', { p_other_user_id: otherUserId })
		.single()

	if (error) throw new Error(error.message)
	return data as ChatGroup
}

export async function getMediaUrl(path: string): Promise<string> {
	const res = await fetch(`/api/chat/media?path=${encodeURIComponent(path)}`)
	if (!res.ok) throw new Error('Failed to get media URL')
	const json = await res.json()
	return json.url
}

export async function fetchDMPartners(
	supabase: SupabaseClient,
	dmGroupIds: string[],
	currentUserId: string,
): Promise<Record<string, string>> {
	if (dmGroupIds.length === 0) return {}

	const { data, error } = await supabase
		.from('chat_members')
		.select('group_id, user_id')
		.in('group_id', dmGroupIds)
		.neq('user_id', currentUserId)

	if (error) throw new Error(error.message)
	if (!data) return {}

	return Object.fromEntries(
		data.map((m: { group_id: string; user_id: string }) => [m.group_id, m.user_id]),
	)
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const AVATAR_MAX_DIM = 256

/**
 * Compress an image file to a JPEG ≤ AVATAR_MAX_DIM on its longest side.
 * Returns a Blob ready for upload.
 */
async function compressAvatar(file: File): Promise<Blob> {
	const bitmap = await createImageBitmap(file)
	const scale = Math.min(1, AVATAR_MAX_DIM / Math.max(bitmap.width, bitmap.height))
	const w = Math.round(bitmap.width * scale)
	const h = Math.round(bitmap.height * scale)

	const canvas = new OffscreenCanvas(w, h)
	const ctx = canvas.getContext('2d')!
	ctx.drawImage(bitmap, 0, 0, w, h)
	bitmap.close()

	return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
}

/**
 * Upload a group avatar image. Compresses to 256px JPEG, enforces 2MB limit,
 * uploads to chat-media storage, and updates the group's avatar_url.
 * Returns the signed URL for immediate display.
 */
export async function uploadGroupAvatar(
	supabase: SupabaseClient,
	groupId: string,
	file: File,
): Promise<string> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Avatar must be an image')
	}
	if (file.size > MAX_AVATAR_SIZE) {
		throw new Error('Avatar must be under 2MB')
	}

	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) throw new Error('Not authenticated')

	const compressed = await compressAvatar(file)
	// Storage policy requires path to start with userId
	const path = `${user.id}/chat/${groupId}/avatar.jpg`

	const { error: uploadError } = await supabase.storage
		.from('chat-media')
		.upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
	if (uploadError) throw new Error(uploadError.message)

	const { data: urlData } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600)
	if (!urlData) throw new Error('Failed to create signed URL for avatar')

	// Persist the signed URL on the group row
	const { error: updateError } = await supabase
		.from('chat_groups')
		.update({ avatar_url: urlData.signedUrl })
		.eq('id', groupId)
	if (updateError) throw new Error(updateError.message)

	return urlData.signedUrl
}
