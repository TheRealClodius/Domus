import { MIN_VIEWPORT_HEIGHT, MIN_VIEWPORT_WIDTH } from '@/lib/platform'

export default function DesktopOnlyPlaceholder() {
	return (
		<div
			data-testid="desktop-only-placeholder"
			className="flex h-screen items-center justify-center bg-surface px-6"
		>
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<h1 className="font-display text-title-md text-on-surface">Domus</h1>
				<p className="text-body-md text-on-surface">Domus is built for desktop.</p>
				<p className="text-body-sm text-on-surface-muted">
					Use a screen at least {MIN_VIEWPORT_WIDTH}×{MIN_VIEWPORT_HEIGHT} to open your spatial
					workspace.
				</p>
				<p className="text-label text-on-surface-muted">A native mobile app may come later.</p>
			</div>
		</div>
	)
}
