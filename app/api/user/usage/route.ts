import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const PLAN_LIMITS: Record<
	string,
	{ agent_turn: number; image_generation: number; web_search: number }
> = {
	free: { agent_turn: 10, image_generation: 0, web_search: 5 },
	citizen: { agent_turn: 200, image_generation: 20, web_search: 50 },
	extra: { agent_turn: 1000, image_generation: 100, web_search: 200 },
}

export async function GET() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { data: profile } = await supabase
		.from('users')
		.select('plan, plan_period_start, plan_period_end')
		.eq('id', user.id)
		.single()

	const plan = profile?.plan ?? null

	// Determine billing window
	let windowStart: Date
	let windowEnd: Date

	if (profile?.plan_period_start && profile?.plan_period_end) {
		windowStart = new Date(profile.plan_period_start)
		windowEnd = new Date(profile.plan_period_end)
	} else {
		const now = new Date()
		windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
		windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
	}

	// Aggregate usage counts per event_type in the window
	const { data: events } = await supabase
		.from('usage_events')
		.select('event_type')
		.eq('user_id', user.id)
		.gte('created_at', windowStart.toISOString())
		.lt('created_at', windowEnd.toISOString())

	const counts: Record<string, number> = {}
	for (const row of events ?? []) {
		counts[row.event_type] = (counts[row.event_type] ?? 0) + 1
	}

	const limits = PLAN_LIMITS[plan ?? 'free'] ?? PLAN_LIMITS.free

	return NextResponse.json({
		agent_turn: { used: counts.agent_turn ?? 0, limit: limits.agent_turn },
		image_generation: { used: counts.image_generation ?? 0, limit: limits.image_generation },
		web_search: { used: counts.web_search ?? 0, limit: limits.web_search },
		resets_at: windowEnd.toISOString(),
		plan,
	})
}
