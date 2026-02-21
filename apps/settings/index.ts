import { Settings } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { BuiltInApp } from '@/apps/_types'

const SettingsApp = dynamic(() => import('@/apps/settings/SettingsApp'))

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
