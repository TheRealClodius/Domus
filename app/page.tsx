import { redirect } from 'next/navigation'
import GoogleSignInButton from '@/core/auth/GoogleSignInButton'
import { getSupabaseServerClient } from '@/core/supabase/server'
import { createSpaceForUser } from './api/space/_createSpace'

export default async function Home() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return (
			<div className="flex h-screen items-center justify-center bg-surface">
				<div className="flex flex-col items-center gap-8 px-6 max-w-sm w-full">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="font-display text-title-lg text-on-surface">Domus</h1>
						<p className="text-body-md text-on-surface-muted">Your spatial workspace.</p>
					</div>
					<GoogleSignInButton />
					<p className="text-center text-label text-on-surface-muted">
						By continuing, you agree to the Terms of Service and Privacy Policy.
					</p>
				</div>
			</div>
		)
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
		await supabase.from('users').update({ active_space_id: firstSpace.id }).eq('id', user.id)
		redirect(`/space/${firstSpace.id}`)
	}

	// User exists but has no spaces — create one server-side
	const spaceId = await createSpaceForUser(supabase, user)
	redirect(`/space/${spaceId}`)
}
