import { redirect } from 'next/navigation'
import SignInButton from '@/core/auth/SignInButton'
import { getSupabaseServerClient } from '@/core/supabase/server'

export default async function Home() {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user) {
		// TODO: Redirect to user's default space
		redirect('/space/default')
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-surface">
			<div className="flex flex-col items-center gap-6">
				<h1 className="text-heading font-semibold text-on-surface">Domus</h1>
				<p className="text-on-surface-muted">Your spatial workspace</p>
				<SignInButton />
			</div>
		</main>
	)
}
