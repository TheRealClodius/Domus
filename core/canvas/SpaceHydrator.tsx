'use client'

import { useEffect } from 'react'
import { useEntityStore } from '@/core/entityStore'
import { startEntitySync } from '@/core/supabase/entitySync'
import type { Entity } from '@/lib/types'

export default function SpaceHydrator({ entities }: { entities: Entity[] }) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: entities is stable per mount — component keyed by space ID
	useEffect(() => {
		useEntityStore.getState().hydrate(entities)
		return startEntitySync()
	}, [])

	return null
}
