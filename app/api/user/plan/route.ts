import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const VALID_PLANS = ['free', 'citizen', 'extra'] as const
type Plan = (typeof VALID_PLANS)[number]

export async function PATCH(req: Request) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = (await req.json()) as { plan?: unknown }
	if (!VALID_PLANS.includes(body.plan as Plan)) {
		return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
	}

	const plan = body.plan as Plan
	const now = new Date()
	const periodEnd = new Date(now)
	periodEnd.setDate(periodEnd.getDate() + 30)

	await supabase
		.from('users')
		.update({
			plan,
			plan_period_start: now.toISOString(),
			plan_period_end: periodEnd.toISOString(),
		})
		.eq('id', user.id)

	const { data: profile } = await supabase
		.from('users')
		.select('name, avatar_url, preferences, plan, plan_period_start, plan_period_end, extra_budget')
		.eq('id', user.id)
		.single()

	return NextResponse.json({
		name: profile?.name ?? '',
		email: user.email ?? '',
		avatarUrl: profile?.avatar_url ?? null,
		customInstruction: (profile?.preferences as Record<string, unknown>)?.custom_instruction ?? '',
		plan: profile?.plan ?? null,
		planPeriodStart: profile?.plan_period_start ?? null,
		planPeriodEnd: profile?.plan_period_end ?? null,
		extraBudget: (profile?.extra_budget as number | null) ?? null,
	})
}
