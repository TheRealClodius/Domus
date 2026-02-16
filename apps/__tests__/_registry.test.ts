import { describe, expect, it } from 'vitest'
import { getAppType, getDockApps } from '@/apps/_registry'

describe('App Registry', () => {
	it('getAppType returns chat definition', () => {
		const app = getAppType('chat')
		expect(app).toBeDefined()
		expect(app!.type).toBe('chat')
		expect(app!.name).toBe('Chat')
	})

	it('getAppType returns calendar definition', () => {
		const app = getAppType('calendar')
		expect(app).toBeDefined()
		expect(app!.type).toBe('calendar')
		expect(app!.name).toBe('Calendar')
	})

	it('getAppType returns settings definition', () => {
		const app = getAppType('settings')
		expect(app).toBeDefined()
		expect(app!.type).toBe('settings')
		expect(app!.name).toBe('Settings')
	})

	it('getAppType returns undefined for nonexistent type', () => {
		expect(getAppType('nonexistent')).toBeUndefined()
	})

	it('getDockApps returns all apps', () => {
		const apps = getDockApps()
		expect(apps.length).toBe(3)
		const types = apps.map((a) => a.type)
		expect(types).toContain('chat')
		expect(types).toContain('calendar')
		expect(types).toContain('settings')
	})

	it('every entry has source built-in', () => {
		const apps = getDockApps()
		for (const app of apps) {
			expect(app.source).toBe('built-in')
		}
	})
})
