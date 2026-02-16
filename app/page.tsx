import { redirect } from 'next/navigation'
import GuestSessionBootstrap from '@/core/auth/GuestSessionBootstrap'
import { getSupabaseServerClient } from '@/core/supabase/server'

export default async function Home() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return <GuestSessionBootstrap />
	}

	// User exists — resolve their active space
	const { data: profile } = await supabase
		.from('users')
		.select('active_space_id')
		.eq('id', user.id)
		.single()

	if (profile?.active_space_id) {
		redirect(`/space/${profile.active_space_id}`)
	}

	// User exists but no active space — check if they have any space
	const { data: firstSpace } = await supabase
		.from('spaces')
		.select('id')
		.eq('user_id', user.id)
		.limit(1)
		.single()

	if (firstSpace) {
		// Set it as active and redirect
		await supabase.from('users').update({ active_space_id: firstSpace.id }).eq('id', user.id)
		redirect(`/space/${firstSpace.id}`)
	}

	// User exists but has no spaces — create one via client flow
	return <GuestSessionBootstrap hasSession />
}
