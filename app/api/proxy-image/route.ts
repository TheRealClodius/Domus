import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function GET(req: NextRequest) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const url = req.nextUrl.searchParams.get('url')
	if (!url) {
		return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
	}

	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
	}

	let upstream: Response
	try {
		upstream = await fetch(url, { signal: AbortSignal.timeout(15_000) })
	} catch {
		return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
	}

	if (!upstream.ok) {
		return NextResponse.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 })
	}

	const contentLength = Number(upstream.headers.get('content-length') ?? 0)
	if (contentLength > MAX_SIZE_BYTES) {
		return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
	}

	const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'

	return new NextResponse(upstream.body, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, max-age=3600',
		},
	})
}
