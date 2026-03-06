import type { BuiltInApp } from '@/apps/_types'
import { calendarApp } from '@/apps/calendar'
import { chatApp } from '@/apps/chat'
import { folderApp } from '@/apps/folder'
import { imageApp } from '@/apps/image'
import { noteApp } from '@/apps/notes'
import { settingsApp } from '@/apps/settings'
import { soundsApp } from '@/apps/sounds'

// All built-in entity types, including structural types like folder that don't appear in the dock
const allBuiltInApps: Record<string, BuiltInApp> = {
	[chatApp.type]: chatApp,
	[calendarApp.type]: calendarApp,
	[settingsApp.type]: settingsApp,
	[soundsApp.type]: soundsApp,
	[folderApp.type]: folderApp,
	[noteApp.type]: noteApp,
	[imageApp.type]: imageApp,
}

// User-launchable apps shown in the dock (excludes structural types like folder)
const dockApps: BuiltInApp[] = [chatApp, calendarApp, settingsApp, soundsApp]

export function getAppType(type: string): BuiltInApp | undefined {
	return allBuiltInApps[type]
}

export function getDockApps(): BuiltInApp[] {
	return dockApps
}

export function getAllAppTypes(): BuiltInApp[] {
	return Object.values(allBuiltInApps)
}
