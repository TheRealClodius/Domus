'use client'

import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { Button } from '@/core/ui/button'

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
		<Button variant="default" size="lg" onClick={handleSignIn}>
			Sign in with Google
		</Button>
	)
}
