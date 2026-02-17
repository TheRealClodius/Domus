'use client'

import { useRef } from 'react'
import { useEntityStore } from '@/core/entityStore'
import { startEntitySync } from '@/core/supabase/entitySync'
import type { Entity } from '@/lib/types'

export default function SpaceHydrator({ entities }: { entities: Entity[] }) {
	const hydrated = useRef(false)
	if (!hydrated.current) {
		hydrated.current = true
		useEntityStore.getState().hydrate(entities)
		startEntitySync()
		// TODO: unsubscribe on space switch
	}
	return null
}
