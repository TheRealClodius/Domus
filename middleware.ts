import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
	const res = NextResponse.next()

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

	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user && req.nextUrl.pathname.startsWith('/space')) {
		return NextResponse.redirect(new URL('/', req.url))
	}

	return res
}

export const config = {
	matcher: ['/space/:path*'],
}
