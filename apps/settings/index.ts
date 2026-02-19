import { Settings } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import SettingsApp from '@/apps/settings/SettingsApp'

export const settingsApp: BuiltInApp = {
	source: 'built-in',
	type: 'settings',
	name: 'Settings',
	icon: Settings,
	component: SettingsApp,
	defaultPresentation: 'window',
	defaultSize: { width: 320, height: 480 },
	maxInstances: 1,
	reduce: (state) => state,
	summarize: () => 'App settings',
}
