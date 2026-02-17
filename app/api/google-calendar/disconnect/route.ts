import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

export async function POST() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { data: integration } = await supabase
		.from('integrations')
		.select('refresh_token')
		.eq('user_id', user.id)
		.eq('provider', 'google_calendar')
		.single()

	if (integration) {
		// Revoke the token with Google (best-effort)
		try {
			await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.refresh_token}`, {
				method: 'POST',
			})
		} catch {
			// User can revoke manually in Google settings
		}

		await supabase
			.from('integrations')
			.delete()
			.eq('user_id', user.id)
			.eq('provider', 'google_calendar')
	}

	return NextResponse.json({ success: true })
}
