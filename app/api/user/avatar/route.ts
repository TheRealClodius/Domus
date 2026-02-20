import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}

export async function POST(req: Request) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const formData = await req.formData()
	const file = formData.get('avatar')

	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'No file provided' }, { status: 400 })
	}

	if (!ALLOWED_TYPES.has(file.type)) {
		return NextResponse.json(
			{ error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
			{ status: 400 },
		)
	}

	if (file.size > MAX_SIZE) {
		return NextResponse.json({ error: 'File too large. Maximum 2 MB.' }, { status: 400 })
	}

	const ext = EXT_MAP[file.type] ?? 'jpg'
	const path = `${user.id}/avatar.${ext}`
	const buffer = Buffer.from(await file.arrayBuffer())

	const { error: uploadError } = await supabase.storage.from('avatars').upload(path, buffer, {
		contentType: file.type,
		upsert: true,
	})

	if (uploadError) {
		return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
	}

	const {
		data: { publicUrl },
	} = supabase.storage.from('avatars').getPublicUrl(path)

	// Append cache-buster so browsers pick up the new avatar
	const avatarUrl = `${publicUrl}?t=${Date.now()}`

	await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id)

	return NextResponse.json({ avatarUrl })
}
