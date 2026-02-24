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
	const query = url.searchParams.get('q')?.trim() ?? ''
	const limitParam = Number(url.searchParams.get('limit') ?? '10')
	const limit = Math.min(Math.max(1, limitParam), 10)

	if (query.length < 2) {
		return NextResponse.json({ users: [] })
	}

	const { data, error } = await supabase
		.from('users')
		.select('id, name, username, avatar_url')
		.ilike('username', `${query}%`)
		.neq('id', user.id)
		.limit(limit)

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 })
	}

	return NextResponse.json({ users: data ?? [] })
}
