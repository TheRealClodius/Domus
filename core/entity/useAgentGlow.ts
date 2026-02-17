import { useEffect, useState } from 'react'
import { AGENT_GLOW } from '@/lib/motion'
import type { EntityCreator } from '@/lib/types'

interface GlowInput {
	created_by: EntityCreator
	updated_at: string
	forcePending?: boolean
}

/** Returns true while the entity should show agent glow. */
export function useAgentGlow({ created_by, updated_at, forcePending }: GlowInput): boolean {
	const [glowing, setGlowing] = useState(() => {
		if (created_by !== 'agent') return false
		const age = Date.now() - new Date(updated_at).getTime()
		return age < AGENT_GLOW.holdMs
	})

	useEffect(() => {
		if (created_by !== 'agent') return
		const age = Date.now() - new Date(updated_at).getTime()
		if (age >= AGENT_GLOW.holdMs) {
			setGlowing(false)
			return
		}
		const remaining = AGENT_GLOW.holdMs - age
		const timer = setTimeout(() => setGlowing(false), remaining)
		return () => clearTimeout(timer)
	}, [created_by, updated_at])

	return forcePending || glowing
}
