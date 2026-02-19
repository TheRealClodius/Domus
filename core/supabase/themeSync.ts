'use client'

import { getSupabaseBrowserClient } from '@/core/supabase/client'
import type { SavedTheme } from '@/core/themeStore'

export interface UserThemePreferences {
	seedHue: number
	chromaScale: number
	savedThemes: SavedTheme[]
	activeThemeId: string | null
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 2000

/** Debounced push of theme preferences to Supabase. */
export function pushThemePreferences(userId: string, prefs: UserThemePreferences): void {
	if (pushTimer) clearTimeout(pushTimer)
	pushTimer = setTimeout(async () => {
		try {
			const supabase = getSupabaseBrowserClient()
			await supabase
				.from('users')
				.update({
					preferences: { theme: prefs },
				})
				.eq('id', userId)
		} catch {
			// Silent fail — localStorage is the fallback
		}
	}, DEBOUNCE_MS)
}

/** Pull theme preferences from Supabase. Returns null if not found or error. */
export async function pullThemePreferences(userId: string): Promise<UserThemePreferences | null> {
	try {
		const supabase = getSupabaseBrowserClient()
		const { data, error } = await supabase
			.from('users')
			.select('preferences')
			.eq('id', userId)
			.single()

		if (error || !data?.preferences) return null

		const prefs = (data.preferences as Record<string, unknown>).theme as
			| UserThemePreferences
			| undefined
		if (!prefs || typeof prefs.seedHue !== 'number') return null
		return prefs
	} catch {
		return null
	}
}
