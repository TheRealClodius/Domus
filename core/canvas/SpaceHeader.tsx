'use client'

import { ArrowLeftRight, LogOut, Star } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSheetStore } from '@/core/sheetStore'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { Button } from '@/core/ui/button'

export interface SpaceHeaderUser {
	name: string
	avatarUrl?: string
}

interface SpaceHeaderProps {
	spaceName: string
	user?: SpaceHeaderUser
	onToggleFavorite?: () => void
	onSwitchSpace?: () => void
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

export default function SpaceHeader({
	spaceName,
	user,
	onToggleFavorite,
	onSwitchSpace,
}: SpaceHeaderProps) {
	const openLogin = useSheetStore((s) => s.open)
	const [dropdownOpen, setDropdownOpen] = useState(false)

	const handleSignOut = useCallback(async () => {
		await getSupabaseBrowserClient().auth.signOut()
		window.location.reload()
	}, [])

	return (
		<div data-testid="space-header" className="flex w-full items-center justify-between py-4 px-4">
			<div className="flex items-center gap-2">
				<h1 className="font-display text-title-md text-on-surface">{spaceName}</h1>
				<Button
					variant="pill-base"
					size="pill"
					aria-label="Favorite space"
					onClick={onToggleFavorite}
				>
					<Star size={16} />
				</Button>
			</div>
			<div className="flex items-center gap-2">
				{user ? (
					<div className="relative">
						<button
							type="button"
							data-testid="user-avatar"
							className="flex size-8 items-center justify-center rounded-full bg-surface-raised text-sm font-medium text-on-surface overflow-hidden"
							onClick={() => setDropdownOpen((prev) => !prev)}
						>
							{user.avatarUrl ? (
								// biome-ignore lint/performance/noImgElement: 32px avatar is not LCP-critical, next/image causes test issues with URL rewriting
								<img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
							) : (
								getInitials(user.name)
							)}
						</button>
						{dropdownOpen && (
							<div
								data-testid="profile-dropdown"
								className="absolute right-0 top-full mt-1 min-w-48 rounded-lg border border-white/20 bg-surface-raised p-2 shadow-lg"
							>
								<p className="px-2 py-1 text-sm font-medium text-on-surface">{user.name}</p>
								<hr className="my-1 border-white/10" />
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start"
									aria-label="Sign out"
									onClick={handleSignOut}
								>
									<LogOut size={14} />
									Sign out
								</Button>
							</div>
						)}
					</div>
				) : (
					<Button
						variant="pill-base"
						size="pill"
						aria-label="Sign in"
						onClick={() => openLogin(null, 'login')}
					>
						Sign in
					</Button>
				)}
				<Button variant="pill-base" size="pill" aria-label="Switch space" onClick={onSwitchSpace}>
					<ArrowLeftRight size={16} />
				</Button>
			</div>
		</div>
	)
}
