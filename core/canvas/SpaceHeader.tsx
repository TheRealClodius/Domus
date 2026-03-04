'use client'

import { ArrowLeftRight, LogOut, Settings } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
	onSwitchSpace?: () => void
}

export function getInitials(name: string): string {
	return name
		.split(' ')
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

export default function SpaceHeader({ spaceName, user, onSwitchSpace }: SpaceHeaderProps) {
	const openSheet = useSheetStore((s) => s.open)
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!dropdownOpen) return
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setDropdownOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [dropdownOpen])

	const handleSignOut = useCallback(async () => {
		await getSupabaseBrowserClient().auth.signOut()
		window.location.reload()
	}, [])

	const handleOpenSettings = useCallback(() => {
		setDropdownOpen(false)
		openSheet(null, 'profile', 'general')
	}, [openSheet])

	return (
		<div data-testid="space-header" className="flex w-full items-center justify-between py-4 px-4">
			<h1 className="font-display text-title-md text-on-surface">{spaceName}</h1>
			<div className="flex items-center gap-2">
				{user ? (
					<div ref={dropdownRef} className="relative">
						<button
							type="button"
							data-testid="user-avatar"
							className="flex size-8 items-center justify-center rounded-full bg-surface-lowest text-body font-medium text-on-surface overflow-hidden"
							onClick={() => setDropdownOpen((prev) => !prev)}
						>
							{user.avatarUrl ? (
								// biome-ignore lint/performance/noImgElement: 32px avatar is not LCP-critical
								<img
									src={user.avatarUrl}
									alt={user.name}
									referrerPolicy="no-referrer"
									className="size-full object-cover"
								/>
							) : (
								getInitials(user.name)
							)}
						</button>
						{dropdownOpen && (
							<div
								data-testid="profile-dropdown"
								className="absolute right-0 top-full mt-1 min-w-48 rounded-lg border border-white/20 bg-surface-lowest p-2 shadow-lg"
							>
								<div className="flex items-center gap-3 px-2 py-2">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-body font-medium text-on-surface overflow-hidden">
										{user.avatarUrl ? (
											// biome-ignore lint/performance/noImgElement: 40px avatar in dropdown
											<img
												src={user.avatarUrl}
												alt={user.name}
												referrerPolicy="no-referrer"
												className="size-full object-cover"
											/>
										) : (
											getInitials(user.name)
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate text-body font-medium text-on-surface">
											{user.name}
										</div>
									</div>
								</div>
								<hr className="my-1 border-white/10" />
								<button
									type="button"
									data-testid="profile-menu-settings"
									className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-body text-on-surface hover:bg-surface-bright"
									onClick={handleOpenSettings}
								>
									<Settings size={14} className="shrink-0 text-on-surface-muted" />
									<span className="flex-1 text-left">Settings</span>
								</button>
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
						onClick={() => openSheet(null, 'login')}
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
