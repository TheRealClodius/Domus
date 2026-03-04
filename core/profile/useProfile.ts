'use client'

import { useEffect } from 'react'
import { create } from 'zustand'

export interface UserProfile {
	name: string
	email: string
	avatarUrl: string | null
	customInstruction: string
	plan: string | null
	planPeriodStart: string | null
	planPeriodEnd: string | null
	/** Monthly spending cap in euros for the 'extra' PAYG plan. null = no cap. */
	extraBudget: number | null
}

export interface UsageStats {
	agent_turn: { used: number; limit: number }
	image_generation: { used: number; limit: number }
	web_search: { used: number; limit: number }
	resets_at: string
	plan: string | null
	/** True for the 'extra' plan — citizen base is included, overage is billed weekly */
	is_payg: boolean
}

interface ProfileState {
	profile: UserProfile | null
	isLoading: boolean
	_fetched: boolean
	usageStats: UsageStats | null
	_usageFetched: boolean
	fetch: () => Promise<void>
	fetchUsage: () => Promise<void>
	updateName: (name: string) => Promise<void>
	updateCustomInstruction: (instruction: string) => Promise<void>
	updateAvatar: (file: File) => Promise<void>
	updatePlan: (plan: 'free' | 'citizen' | 'extra') => Promise<void>
	updateExtraBudget: (budget: number | null) => Promise<void>
}

export const useProfileStore = create<ProfileState>((set, get) => ({
	profile: null,
	isLoading: true,
	_fetched: false,
	usageStats: null,
	_usageFetched: false,

	fetch: async () => {
		if (get()._fetched) return
		set({ _fetched: true, isLoading: true })
		try {
			const res = await fetch('/api/user/profile')
			if (res.ok) {
				set({ profile: await res.json() })
			}
		} catch {
			// Profile unavailable
		} finally {
			set({ isLoading: false })
		}
	},

	fetchUsage: async () => {
		if (get()._usageFetched) return
		set({ _usageFetched: true })
		try {
			const res = await fetch('/api/user/usage')
			if (res.ok) {
				set({ usageStats: await res.json() })
			}
		} catch {
			// Usage unavailable
		}
	},

	updateName: async (name: string) => {
		const prev = get().profile
		if (prev) set({ profile: { ...prev, name } })
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			})
			if (res.ok) {
				set({ profile: await res.json() })
			} else if (prev) {
				set({ profile: prev })
			}
		} catch {
			if (prev) set({ profile: prev })
		}
	},

	updateCustomInstruction: async (customInstruction: string) => {
		const prev = get().profile
		if (prev) set({ profile: { ...prev, customInstruction } })
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ customInstruction }),
			})
			if (res.ok) {
				set({ profile: await res.json() })
			} else if (prev) {
				set({ profile: prev })
			}
		} catch {
			if (prev) set({ profile: prev })
		}
	},

	updatePlan: async (plan: 'free' | 'citizen' | 'extra') => {
		const prev = get().profile
		if (prev) set({ profile: { ...prev, plan } })
		try {
			const res = await fetch('/api/user/plan', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ plan }),
			})
			if (res.ok) {
				set({ profile: await res.json(), _usageFetched: false })
			} else if (prev) {
				set({ profile: prev })
			}
		} catch {
			if (prev) set({ profile: prev })
		}
	},

	updateExtraBudget: async (extraBudget: number | null) => {
		const prev = get().profile
		if (prev) set({ profile: { ...prev, extraBudget } })
		try {
			const res = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ extraBudget }),
			})
			if (res.ok) {
				set({ profile: await res.json() })
			} else if (prev) {
				set({ profile: prev })
			}
		} catch {
			if (prev) set({ profile: prev })
		}
	},

	updateAvatar: async (file: File) => {
		const formData = new FormData()
		formData.append('avatar', file)
		try {
			const res = await fetch('/api/user/avatar', {
				method: 'POST',
				body: formData,
			})
			if (res.ok) {
				const { avatarUrl } = await res.json()
				const prev = get().profile
				if (prev) set({ profile: { ...prev, avatarUrl } })
			}
		} catch {
			// Upload failed silently
		}
	},
}))

/** Hook wrapper — triggers fetch on first use, returns store state */
export function useProfile() {
	const store = useProfileStore()

	useEffect(() => {
		store.fetch()
	}, [store.fetch])

	return {
		profile: store.profile,
		isLoading: store.isLoading,
		updateName: store.updateName,
		updateCustomInstruction: store.updateCustomInstruction,
		updateAvatar: store.updateAvatar,
	}
}
