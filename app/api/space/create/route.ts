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

	// Ensure public.users profile exists (trigger may not fire on hosted Supabase)
	const { data: profile } = await supabase.from('users').select('id').eq('id', user.id).single()
	if (!profile) {
		const meta = user.user_metadata ?? {}
		const { error: profileError } = await supabase.from('users').insert({
			id: user.id,
			username: `guest-${user.id.substring(0, 8)}`,
			name: (meta.full_name as string) ?? null,
			avatar_url: (meta.avatar_url as string) ?? null,
		})
		if (profileError) {
			console.error('Profile creation error:', profileError)
			return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
		}
	}

	// Look for the system Starter template
	const { data: template } = await supabase
		.from('space_templates')
		.select('entities')
		.eq('is_system', true)
		.limit(1)
		.single()

	// Create a new space
	const { data: space, error: spaceError } = await supabase
		.from('spaces')
		.insert({ user_id: user.id, name: 'My Space' })
		.select('id')
		.single()

	if (spaceError || !space) {
		console.error('Space creation error:', spaceError)
		return NextResponse.json({ error: 'Failed to create space' }, { status: 500 })
	}

	// Stamp template entities into the space if a template exists
	if (template?.entities && Array.isArray(template.entities)) {
		const entities = template.entities.map((e: Record<string, unknown>) => ({
			...e,
			space_id: space.id,
			user_id: user.id,
		}))
		await supabase.from('entities').insert(entities)
	}

	// Set this as the user's active space
	await supabase.from('users').update({ active_space_id: space.id }).eq('id', user.id)

	return NextResponse.json({ space_id: space.id })
}
