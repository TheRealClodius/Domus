'use client'

import { useThemeStore } from '@/core/themeStore'

const THEME_LABELS: Record<string, string> = {
	light: 'Light',
	dark: 'Dark',
	system: 'System',
}

export default function SettingsCard() {
	const mode = useThemeStore((s) => s.mode)
	const seedHue = useThemeStore((s) => s.seedHue)
	return (
		<div data-testid="settings-card" className="flex items-center gap-2 p-3">
			<span
				className="size-3 shrink-0 rounded-full"
				style={{ backgroundColor: `oklch(0.6 0.2 ${seedHue})` }}
			/>
			<span className="text-label text-on-surface-muted">Theme · {THEME_LABELS[mode]}</span>
		</div>
	)
}
