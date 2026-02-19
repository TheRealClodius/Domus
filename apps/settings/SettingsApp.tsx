'use client'

import { X } from 'lucide-react'
import { useState } from 'react'
import type { AppProps } from '@/apps/_types'
import HueSlider from '@/apps/settings/HueSlider'
import SettingsCard from '@/apps/settings/SettingsCard'
import { type ThemeMode, useThemeStore } from '@/core/themeStore'
import { Button } from '@/core/ui/button'
import { Slider } from '@/core/ui/slider'

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'System' },
]

const PRESET_HUES = [0, 45, 90, 135, 180, 225, 264, 315]

export default function SettingsApp({ entityId: _entityId, mode }: AppProps) {
	const themeMode = useThemeStore((s) => s.mode)
	const setMode = useThemeStore((s) => s.setMode)
	const seedHue = useThemeStore((s) => s.seedHue)
	const setSeedHue = useThemeStore((s) => s.setSeedHue)
	const chromaScale = useThemeStore((s) => s.chromaScale)
	const setChromaScale = useThemeStore((s) => s.setChromaScale)
	const savedThemes = useThemeStore((s) => s.savedThemes)
	const activeThemeId = useThemeStore((s) => s.activeThemeId)
	const saveTheme = useThemeStore((s) => s.saveTheme)
	const deleteTheme = useThemeStore((s) => s.deleteTheme)
	const applyTheme = useThemeStore((s) => s.applyTheme)
	const resetToDefault = useThemeStore((s) => s.resetToDefault)

	const [saveName, setSaveName] = useState('')

	if (mode === 'card') return <SettingsCard />

	return (
		<div className="flex h-full flex-col gap-5 overflow-auto scroll-fade px-4 pt-14 pb-6">
			{/* Appearance */}
			<section>
				<span className="text-body-sm font-medium text-on-surface-muted">Appearance</span>
				<div className="mt-1.5 flex gap-1">
					{MODE_OPTIONS.map((opt) => (
						<Button
							key={opt.value}
							variant={themeMode === opt.value ? 'pill-active' : 'pill-secondary'}
							size="pill"
							onClick={() => setMode(opt.value)}
						>
							{opt.label}
						</Button>
					))}
				</div>
			</section>

			{/* Accent Color */}
			<section>
				<span className="text-body-sm font-medium text-on-surface-muted">Accent Color</span>
				<div className="mt-2">
					<HueSlider value={seedHue} onValueChange={setSeedHue} />
				</div>
				<div className="mt-2.5 flex gap-2">
					{PRESET_HUES.map((hue) => (
						<button
							key={hue}
							type="button"
							aria-label={`Hue ${hue}`}
							className={`size-5 shrink-0 rounded-full border-2 transition-transform ${
								seedHue === hue ? 'scale-125 border-on-surface' : 'border-transparent'
							}`}
							style={{ backgroundColor: `oklch(0.65 0.2 ${hue})` }}
							onClick={() => setSeedHue(hue)}
						/>
					))}
				</div>
			</section>

			{/* Vibrancy */}
			<section>
				<Slider
					label="Vibrancy"
					valueDisplay={`${Math.round(chromaScale * 100)}%`}
					min={50}
					max={200}
					step={5}
					value={[Math.round(chromaScale * 100)]}
					onValueChange={([v]) => setChromaScale(v / 100)}
					size="sm"
				/>
			</section>

			{/* Saved Themes */}
			<section>
				<span className="text-body-sm font-medium text-on-surface-muted">Saved Themes</span>
				{savedThemes.length > 0 && (
					<div className="mt-1.5 flex flex-col gap-1">
						{savedThemes.map((theme) => (
							<div
								key={theme.id}
								className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-body-sm transition-colors ${
									activeThemeId === theme.id
										? 'bg-primary/10 text-on-surface'
										: 'text-on-surface-muted hover:bg-surface-high'
								}`}
							>
								<button
									type="button"
									className="flex min-w-0 flex-1 items-center gap-2"
									onClick={() => applyTheme(theme.id)}
								>
									<span
										className="size-3 shrink-0 rounded-full"
										style={{ backgroundColor: `oklch(0.6 0.2 ${theme.seedHue})` }}
									/>
									<span className="truncate">{theme.name}</span>
								</button>
								<button
									type="button"
									aria-label={`Delete ${theme.name}`}
									className="shrink-0 text-on-surface-muted hover:text-error"
									onClick={() => deleteTheme(theme.id)}
								>
									<X className="size-3.5" />
								</button>
							</div>
						))}
					</div>
				)}
				<div className="mt-2 flex gap-1.5">
					<input
						type="text"
						placeholder="Theme name"
						value={saveName}
						onChange={(e) => setSaveName(e.target.value)}
						className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-high px-2.5 py-1.5 text-body-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
						onKeyDown={(e) => {
							if (e.key === 'Enter' && saveName.trim()) {
								saveTheme(saveName.trim())
								setSaveName('')
							}
						}}
					/>
					<Button
						variant="pill-secondary"
						size="pill"
						disabled={!saveName.trim()}
						onClick={() => {
							if (saveName.trim()) {
								saveTheme(saveName.trim())
								setSaveName('')
							}
						}}
					>
						Save
					</Button>
				</div>
			</section>

			{/* Reset */}
			<section>
				<Button
					variant="ghost"
					size="sm"
					className="text-on-surface-muted"
					onClick={resetToDefault}
				>
					Reset to Default
				</Button>
			</section>
		</div>
	)
}
