import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url)
	const code = searchParams.get('code')

	if (!code) {
		return NextResponse.redirect(new URL('/', req.url))
	}

	const res = NextResponse.redirect(new URL('/', req.url))

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
		{
			cookies: {
				getAll() {
					return req.cookies.getAll()
				},
				setAll(cookiesToSet) {
					for (const { name, value, options } of cookiesToSet) {
						res.cookies.set(name, value, options)
					}
				},
			},
		},
	)

	const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
	const user = sessionData?.user

	if (!user) {
		return res
	}

	// If this was a Google Calendar connect flow, store the refresh token
	const isCalendarConnect = searchParams.get('calendar_connect') === 'true'
	if (isCalendarConnect && sessionData?.session) {
		const refreshToken = sessionData.session.provider_refresh_token
		if (refreshToken) {
			await supabase.from('integrations').upsert(
				{
					user_id: user.id,
					provider: 'google_calendar',
					refresh_token: refreshToken,
					scopes: 'https://www.googleapis.com/auth/calendar.readonly',
				},
				{ onConflict: 'user_id,provider' },
			)
		}
	}

	// If this was an anonymous→OAuth upgrade, update profile with Google data
	const meta = user.user_metadata
	if (meta?.full_name || meta?.avatar_url) {
		await supabase
			.from('users')
			.update({
				name: meta.full_name ?? null,
				avatar_url: meta.avatar_url ?? null,
			})
			.eq('id', user.id)
	}

	// Check if user has an active space
	const { data: profile } = await supabase
		.from('users')
		.select('active_space_id')
		.eq('id', user.id)
		.single()

	if (profile?.active_space_id) {
		return NextResponse.redirect(new URL(`/space/${profile.active_space_id}`, req.url), {
			headers: res.headers,
		})
	}

	// Check for any existing space
	const { data: existingSpace } = await supabase
		.from('spaces')
		.select('id')
		.eq('user_id', user.id)
		.limit(1)
		.single()

	if (existingSpace) {
		await supabase.from('users').update({ active_space_id: existingSpace.id }).eq('id', user.id)
		return NextResponse.redirect(new URL(`/space/${existingSpace.id}`, req.url), {
			headers: res.headers,
		})
	}

	// No spaces — redirect to / which will trigger space creation
	return res
}
