import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'

const DEBUG_USER_ID = 'a0000000-0000-4000-8000-000000000001'
const DEBUG_EMAIL = 'debug-agent@domus.dev'

export async function GET(req: NextRequest) {
	if (process.env.NODE_ENV !== 'development') {
		return NextResponse.json({ error: 'Not available' }, { status: 404 })
	}

	const service = getSupabaseServiceClient()

	const { data: existing } = await service.auth.admin.getUserById(DEBUG_USER_ID)
	if (!existing?.user) {
		const { error: createError } = await service.auth.admin.createUser({
			id: DEBUG_USER_ID,
			email: DEBUG_EMAIL,
			email_confirm: true,
			user_metadata: { full_name: 'Debug Agent' },
		})
		if (createError) {
			return NextResponse.json(
				{ error: `Failed to create debug user: ${createError.message}` },
				{ status: 500 },
			)
		}
	}

	const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
		type: 'magiclink',
		email: DEBUG_EMAIL,
	})

	if (linkError || !linkData?.properties?.hashed_token) {
		return NextResponse.json(
			{ error: `Failed to generate link: ${linkError?.message ?? 'no token'}` },
			{ status: 500 },
		)
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

	const { error: verifyError } = await supabase.auth.verifyOtp({
		type: 'magiclink',
		token_hash: linkData.properties.hashed_token,
	})

	if (verifyError) {
		return NextResponse.json({ error: verifyError.message }, { status: 500 })
	}

	return res
}
