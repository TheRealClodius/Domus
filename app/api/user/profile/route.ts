import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

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
		.select('name, avatar_url, preferences, plan, plan_period_start, plan_period_end')
		.eq('id', user.id)
		.single()

	return NextResponse.json({
		name: profile?.name ?? '',
		email: user.email ?? '',
		avatarUrl: profile?.avatar_url ?? null,
		customInstruction: (profile?.preferences as Record<string, unknown>)?.custom_instruction ?? '',
		plan: profile?.plan ?? 'citizen',
		planPeriodStart: profile?.plan_period_start ?? null,
		planPeriodEnd: profile?.plan_period_end ?? null,
	})
}

export async function PATCH(req: Request) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = (await req.json()) as { name?: string; customInstruction?: string }
	const updates: Record<string, unknown> = {}

	if (body.name !== undefined) {
		updates.name = body.name
	}

	if (body.customInstruction !== undefined) {
		// Merge into existing preferences jsonb
		const { data: existing } = await supabase
			.from('users')
			.select('preferences')
			.eq('id', user.id)
			.single()

		const prefs = (existing?.preferences as Record<string, unknown>) ?? {}
		updates.preferences = { ...prefs, custom_instruction: body.customInstruction }
	}

	if (Object.keys(updates).length > 0) {
		await supabase.from('users').update(updates).eq('id', user.id)
	}

	// Return updated profile
	const { data: profile } = await supabase
		.from('users')
		.select('name, avatar_url, preferences, plan, plan_period_start, plan_period_end')
		.eq('id', user.id)
		.single()

	return NextResponse.json({
		name: profile?.name ?? '',
		email: user.email ?? '',
		avatarUrl: profile?.avatar_url ?? null,
		customInstruction: (profile?.preferences as Record<string, unknown>)?.custom_instruction ?? '',
		plan: profile?.plan ?? 'citizen',
		planPeriodStart: profile?.plan_period_start ?? null,
		planPeriodEnd: profile?.plan_period_end ?? null,
	})
}
