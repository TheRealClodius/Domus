import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

export async function GET(request: Request) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const url = new URL(request.url)
	const path = url.searchParams.get('path')
	if (!path) {
		return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
	}

	// Path format: {userId}/chat/{groupId}/{messageId}/{filename}
	const segments = path.split('/')
	if (segments.length < 4) {
		return NextResponse.json({ error: 'Invalid path format' }, { status: 400 })
	}

	const groupId = segments[2]

	// Verify caller is a member of the group
	const { data: membership } = await supabase
		.from('chat_members')
		.select('group_id')
		.eq('group_id', groupId)
		.eq('user_id', user.id)
		.single()

	if (!membership) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}

	const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(path, 3600)

	if (error || !data) {
		return NextResponse.json(
			{ error: error?.message ?? 'Failed to create signed URL' },
			{ status: 500 },
		)
	}

	return NextResponse.json({ url: data.signedUrl })
}
