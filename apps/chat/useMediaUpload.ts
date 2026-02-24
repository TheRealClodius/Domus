import { getSupabaseBrowserClient } from '@/core/supabase/client'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export interface UploadResult {
	path: string
	type: string
}

export async function uploadMedia(
	file: File,
	groupId: string,
	messageId: string,
	userId: string,
): Promise<UploadResult> {
	if (file.size > MAX_FILE_SIZE) {
		throw new Error('File size exceeds 10MB limit')
	}

	const supabase = getSupabaseBrowserClient()
	const path = `${userId}/chat/${groupId}/${messageId}/${file.name}`

	const { error } = await supabase.storage
		.from('chat-media')
		.upload(path, file, { contentType: file.type })

	if (error) throw new Error(error.message)

	return { path, type: file.type }
}
