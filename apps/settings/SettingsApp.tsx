'use client'

import type { AppProps } from '@/apps/_types'
import SettingsCard from '@/apps/settings/SettingsCard'
import AppearanceSection from '@/core/profile/sections/AppearanceSection'

export default function SettingsApp({ entityId: _entityId, mode }: AppProps) {
	if (mode === 'card') return <SettingsCard />

	return (
		<div className="flex h-full flex-col overflow-auto scroll-fade px-4 pt-14 pb-6">
			<AppearanceSection />
		</div>
	)
}
