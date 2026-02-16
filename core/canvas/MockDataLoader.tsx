'use client'

import { useEffect } from 'react'
import { useEntityStore } from '@/core/entityStore'

// TODO: Replace with real entity fetch from Supabase
export default function MockDataLoader() {
	const loadMockData = useEntityStore((s) => s.loadMockData)

	useEffect(() => {
		loadMockData()
	}, [loadMockData])

	return null
}
