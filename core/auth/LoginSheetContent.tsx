'use client'

import GoogleSignInButton from '@/core/auth/GoogleSignInButton'

export default function LoginSheetContent() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="flex flex-col items-center gap-8 px-6">
				<div className="flex flex-col items-center gap-2">
					<h1 className="font-display text-3xl text-on-surface">Domus</h1>
					<p className="text-body text-on-surface-muted">Your spatial workspace.</p>
				</div>

				<GoogleSignInButton />

				<p className="max-w-sm text-center text-label text-on-surface-muted">
					By continuing, you agree to the <span className="underline">Terms of Service</span> and{' '}
					<span className="underline">Privacy Policy</span>.
				</p>
			</div>
		</div>
	)
}
