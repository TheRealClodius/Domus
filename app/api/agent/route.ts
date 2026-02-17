import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'
import { checkRateLimit } from './rateLimit'

export async function POST(req: NextRequest) {
	const contentLength = Number(req.headers.get('content-length') ?? 0)
	if (contentLength > 25 * 1024 * 1024) {
		return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
	}

	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const rateCheck = checkRateLimit(user.id)
	if (!rateCheck.allowed) {
		return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
	}

	const body = await req.json()
	body.user_id = user.id
	const agentUrl = process.env.DOMUS_AGENT_URL || 'http://localhost:8000'
	const serviceToken = process.env.DOMUS_SERVICE_TOKEN || ''

	const agentResponse = await fetch(`${agentUrl}/agent`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${serviceToken}`,
		},
		body: JSON.stringify(body),
	})

	if (!agentResponse.ok || !agentResponse.body) {
		return NextResponse.json({ error: 'Agent request failed' }, { status: agentResponse.status })
	}

	return new Response(agentResponse.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	})
}
