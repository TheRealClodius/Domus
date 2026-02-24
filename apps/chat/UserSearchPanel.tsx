'use client'

import { Search, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as queries from '@/apps/chat/queries'
import type { ChatUserSearchResult } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'
import { Input } from '@/core/ui/input'

interface UserSearchPanelProps {
	onSelectUser: (userId: string) => void
	onClose: () => void
}

export default function UserSearchPanel({ onSelectUser, onClose }: UserSearchPanelProps) {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<ChatUserSearchResult[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const handleSearch = useCallback((value: string) => {
		setQuery(value)

		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (value.trim().length < 2) {
			setResults([])
			setIsLoading(false)
			return
		}

		setIsLoading(true)
		debounceRef.current = setTimeout(async () => {
			const users = await queries.searchUsers(value.trim())
			setResults(users)
			setIsLoading(false)
		}, 300)
	}, [])

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [])

	return (
		<div className="h-full bg-surface flex flex-col relative">
			{/* Close button */}
			<div className="absolute top-4 left-4 z-10">
				<Button variant="pill-secondary" size="pill" onClick={onClose} aria-label="Close">
					<X className="size-3.5" />
				</Button>
			</div>

			{/* Header + Search */}
			<div className="pt-14 px-4 pb-3">
				<h2 className="text-heading text-on-surface mb-3 text-center">New message</h2>
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-muted pointer-events-none" />
					<Input
						ref={inputRef}
						value={query}
						onChange={(e) => handleSearch(e.target.value)}
						placeholder="Search by username..."
						className="pl-9 bg-surface-lowest"
					/>
				</div>
			</div>

			{/* Results */}
			<div className="flex-1 overflow-auto px-2">
				{isLoading && (
					<div className="flex justify-center py-8">
						<div className="size-5 border-2 border-on-surface-muted border-t-transparent rounded-full animate-spin" />
					</div>
				)}

				{!isLoading && query.trim().length >= 2 && results.length === 0 && (
					<p className="text-body-sm text-on-surface-muted text-center py-8">No users found</p>
				)}

				{!isLoading &&
					results.map((user) => (
						<button
							key={user.id}
							type="button"
							onClick={() => onSelectUser(user.id)}
							className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-on-surface/8"
						>
							<div className="size-10 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
								{user.avatar_url ? (
									<Image
										src={user.avatar_url}
										alt=""
										width={40}
										height={40}
										className="size-full object-cover"
										unoptimized
									/>
								) : (
									<span className="text-body font-medium text-primary">
										{(user.name ?? user.username)[0].toUpperCase()}
									</span>
								)}
							</div>
							<div className="min-w-0">
								{user.name && (
									<p className="text-[14px] font-semibold leading-5 text-on-surface truncate">
										{user.name}
									</p>
								)}
								<p className="text-[14px] leading-[18px] text-on-surface-muted truncate">
									@{user.username}
								</p>
							</div>
						</button>
					))}
			</div>
		</div>
	)
}
