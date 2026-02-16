'use client'

import { getSupabaseBrowserClient } from '@/core/supabase/client'

export default function SignInButton() {
	const handleSignIn = async () => {
		const supabase = getSupabaseBrowserClient()
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		})

		if (error) {
			console.error('OAuth sign-in error:', error.message)
			return
		}

		if (data.url) {
			window.location.href = data.url
		}
	}

	return (
		<button
			type="button"
			onClick={handleSignIn}
			className="rounded-md bg-primary px-6 py-3 text-on-primary font-medium"
		>
			Sign in with Google
		</button>
	)
}
