import type { BuiltInApp } from '@/apps/_types'
import { calendarApp } from '@/apps/calendar'
import { chatApp } from '@/apps/chat'
import { settingsApp } from '@/apps/settings'

const builtInApps: Record<string, BuiltInApp> = {
	[chatApp.type]: chatApp,
	[calendarApp.type]: calendarApp,
	[settingsApp.type]: settingsApp,
}

export function getAppType(type: string): BuiltInApp | undefined {
	return builtInApps[type]
}

export function getDockApps(): BuiltInApp[] {
	return Object.values(builtInApps)
}
