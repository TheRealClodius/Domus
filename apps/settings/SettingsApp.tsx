'use client'

import type { AppProps } from '@/apps/_types'
import { type ThemeMode, useThemeStore } from '@/core/themeStore'
import { Button } from '@/core/ui/button'

const OPTIONS: { value: ThemeMode; label: string }[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'System' },
]

export default function SettingsApp({ entityId: _entityId }: AppProps) {
	const mode = useThemeStore((s) => s.mode)
	const setMode = useThemeStore((s) => s.setMode)

	return (
		<div className="flex flex-col gap-3 p-4">
			<span className="text-body-sm font-medium text-on-surface-muted">Appearance</span>
			<div className="flex gap-1">
				{OPTIONS.map((opt) => (
					<Button
						key={opt.value}
						variant={mode === opt.value ? 'pill-active' : 'pill-secondary'}
						size="pill"
						onClick={() => setMode(opt.value)}
					>
						{opt.label}
					</Button>
				))}
			</div>
		</div>
	)
}
