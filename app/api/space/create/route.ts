import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'
import { createSpaceForUser } from '../_createSpace'

export async function POST() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const space_id = await createSpaceForUser(supabase, user)
		return NextResponse.json({ space_id })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to create space'
		console.error('Space creation error:', message)
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
