import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

export async function POST(req: NextRequest) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = await req.json()
	body.user_id = user.id

	if (!body.space_id) {
		return NextResponse.json({ error: 'Missing space_id' }, { status: 400 })
	}

	if (!body.action_id) {
		return NextResponse.json({ error: 'Missing action_id' }, { status: 400 })
	}

	const { data: space } = await supabase
		.from('spaces')
		.select('id')
		.eq('id', body.space_id)
		.eq('user_id', user.id)
		.single()

	if (!space) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}

	const agentUrl = process.env.DOMUS_AGENT_URL || 'http://localhost:8000'
	const serviceToken = process.env.DOMUS_SERVICE_TOKEN || ''

	const agentResponse = await fetch(`${agentUrl}/agent/action-result`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${serviceToken}`,
		},
		body: JSON.stringify(body),
	})

	if (!agentResponse.ok) {
		console.error('[action-result] agent responded with', agentResponse.status)
		return NextResponse.json(
			{ ok: false, status: agentResponse.status, action_id: body.action_id },
			{ status: agentResponse.status >= 500 ? 502 : agentResponse.status },
		)
	}

	return NextResponse.json({ ok: true })
}
