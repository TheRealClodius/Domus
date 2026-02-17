import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

export async function GET() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ connected: false })
	}

	const { data: integration } = await supabase
		.from('integrations')
		.select('id')
		.eq('user_id', user.id)
		.eq('provider', 'google_calendar')
		.single()

	return NextResponse.json({ connected: !!integration })
}
