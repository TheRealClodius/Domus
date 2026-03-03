'use client'

import { Calendar, Camera } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGoogleCalendarConnection } from '@/apps/calendar/useGoogleCalendarConnection'
import ConnectionRow from '@/core/profile/ConnectionRow'
import { useGoogleDriveConnection } from '@/core/profile/useGoogleDriveConnection'
import { useProfile, useProfileStore } from '@/core/profile/useProfile'
import GoogleDriveIcon from '@/core/ui/icons/google-drive'

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

function formatDate(dateStr: string | null): string {
	if (!dateStr) return '—'
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

const PLAN_LABELS: Record<string, string> = {
	free: 'Domus Free',
	citizen: 'Domus Citizen',
	extra: 'Domus Extra',
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type ProfileSection = 'general' | 'connections' | 'billing' | 'usage'

interface ProfilePanelProps {
	sectionId: ProfileSection
}

export default function ProfilePanel({ sectionId }: ProfilePanelProps) {
	const { profile, isLoading, updateName, updateCustomInstruction, updateAvatar } = useProfile()

	if (isLoading) {
		return (
			<div data-testid="profile-panel" className="flex flex-col items-center justify-center py-20">
				<p className="text-body text-on-surface-muted">Loading profile…</p>
			</div>
		)
	}

	if (!profile) {
		return (
			<div data-testid="profile-panel" className="flex flex-col items-center justify-center py-20">
				<p className="text-body text-on-surface-muted">Unable to load profile.</p>
			</div>
		)
	}

	return (
		<div data-testid="profile-panel" className="flex flex-col gap-6">
			{sectionId === 'general' && (
				<GeneralSection
					profile={profile}
					updateName={updateName}
					updateCustomInstruction={updateCustomInstruction}
					updateAvatar={updateAvatar}
				/>
			)}
			{sectionId === 'connections' && <ConnectionsSection />}
			{sectionId === 'billing' && <BillingSection profile={profile} />}
			{sectionId === 'usage' && <UsageSection />}
		</div>
	)
}

/* ── General ────────────────────────────────────────────── */

function GeneralSection({
	profile,
	updateName,
	updateCustomInstruction,
	updateAvatar,
}: {
	profile: NonNullable<ReturnType<typeof useProfile>['profile']>
	updateName: (name: string) => Promise<void>
	updateCustomInstruction: (instruction: string) => Promise<void>
	updateAvatar: (file: File) => Promise<void>
}) {
	const [name, setName] = useState<string | null>(null)
	const [instruction, setInstruction] = useState<string | null>(null)
	const [avatarError, setAvatarError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const displayName = name ?? profile.name
	const displayInstruction = instruction ?? profile.customInstruction

	const handleNameBlur = useCallback(() => {
		if (name !== null && name !== profile.name) {
			updateName(name)
		}
	}, [name, profile.name, updateName])

	const handleInstructionBlur = useCallback(() => {
		if (instruction !== null && instruction !== profile.customInstruction) {
			updateCustomInstruction(instruction)
		}
	}, [instruction, profile.customInstruction, updateCustomInstruction])

	const handleAvatarChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (!file) return
			setAvatarError(null)
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setAvatarError('Please upload a JPEG, PNG, or WebP image.')
				return
			}
			if (file.size > MAX_AVATAR_SIZE) {
				setAvatarError('Image must be under 2 MB.')
				return
			}
			await updateAvatar(file)
		},
		[updateAvatar],
	)

	return (
		<>
			{/* Profile Header */}
			<section className="flex items-center gap-4">
				<div className="relative">
					<button
						type="button"
						data-testid="avatar-upload"
						className="group flex size-16 items-center justify-center rounded-full bg-surface text-xl font-medium text-on-surface overflow-hidden border-2 border-outline-variant"
						onClick={() => fileInputRef.current?.click()}
					>
						{profile.avatarUrl ? (
							// biome-ignore lint/performance/noImgElement: 64px avatar is not LCP-critical
							<img
								src={profile.avatarUrl}
								alt={profile.name}
								referrerPolicy="no-referrer"
								className="size-full object-cover"
							/>
						) : (
							getInitials(profile.name)
						)}
						<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
							<Camera size={20} className="text-white" />
						</div>
					</button>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={handleAvatarChange}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-title-sm font-medium text-on-surface">{profile.name}</div>
					<div className="text-body text-on-surface-muted">{profile.email}</div>
					{avatarError && <div className="mt-1 text-label text-error">{avatarError}</div>}
				</div>
			</section>

			{/* Name + Custom instruction */}
			<section>
				<div className="flex flex-col gap-3">
					<div>
						<label htmlFor="profile-name" className="mb-1 block text-label text-on-surface-muted">
							Name
						</label>
						<input
							id="profile-name"
							type="text"
							value={displayName}
							onChange={(e) => setName(e.target.value)}
							onBlur={handleNameBlur}
							className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
					<div>
						<label
							htmlFor="profile-instruction"
							className="mb-1 block text-label text-on-surface-muted"
						>
							About you
						</label>
						<textarea
							id="profile-instruction"
							rows={4}
							value={displayInstruction}
							onChange={(e) => setInstruction(e.target.value)}
							onBlur={handleInstructionBlur}
							placeholder="Tell Domus about yourself — things you want it to remember across conversations…"
							className="w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>
					</div>
				</div>
			</section>
		</>
	)
}

/* ── Connections ────────────────────────────────────────── */

function ConnectionsSection() {
	const calendar = useGoogleCalendarConnection()
	const drive = useGoogleDriveConnection()

	return (
		<section>
			<div className="flex flex-col gap-1">
				<ConnectionRow
					icon={<Calendar size={18} />}
					name="Google Calendar"
					isConnected={calendar.isConnected}
					isLoading={calendar.isLoading}
					onConnect={calendar.connect}
					onDisconnect={calendar.disconnect}
				/>
				<ConnectionRow
					icon={<GoogleDriveIcon size={18} />}
					name="Google Drive"
					isConnected={drive.isConnected}
					isLoading={drive.isLoading}
					onConnect={drive.connect}
					onDisconnect={drive.disconnect}
				/>
			</div>
		</section>
	)
}

/* ── Billing ───────────────────────────────────────────── */

function BillingSection({
	profile,
}: {
	profile: NonNullable<ReturnType<typeof useProfile>['profile']>
}) {
	return (
		<section>
			<div className="rounded-lg border border-outline-variant bg-surface px-4 py-3">
				<div className="text-body font-medium text-on-surface">
					{PLAN_LABELS[profile.plan ?? 'free'] ?? profile.plan ?? 'Domus Free'}
				</div>
				{profile.planPeriodStart && (
					<div className="mt-0.5 text-label text-on-surface-muted">
						{formatDate(profile.planPeriodStart)} – {formatDate(profile.planPeriodEnd)}
					</div>
				)}
			</div>
		</section>
	)
}

/* ── Usage ─────────────────────────────────────────────── */

function UsageSection() {
	const fetchUsage = useProfileStore((s) => s.fetchUsage)
	const usageStats = useProfileStore((s) => s.usageStats)
	const _usageFetched = useProfileStore((s) => s._usageFetched)

	useEffect(() => {
		fetchUsage()
	}, [fetchUsage])

	const isLoading = _usageFetched && usageStats === null
	const isPaidPlan = usageStats?.plan != null

	const rows: Array<{ label: string; key: 'agent_turn' | 'image_generation' | 'web_search' }> = [
		{ label: 'Messages', key: 'agent_turn' },
		{ label: 'Images', key: 'image_generation' },
		{ label: 'Web Searches', key: 'web_search' },
	]

	const formatResetsAt = (iso: string) => {
		return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
	}

	return (
		<section>
			<div className="rounded-lg border border-outline-variant bg-surface px-4 py-3 flex flex-col gap-3">
				{!_usageFetched || (usageStats === null && !isLoading) ? (
					/* Skeleton while fetching */
					<div className="flex flex-col gap-3">
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex flex-col gap-1.5">
								<div className="relative h-3 w-24 rounded overflow-hidden bg-surface-lowest">
									<span className="shimmer-sweep absolute inset-0" aria-hidden="true" />
								</div>
								<div className="relative h-2 rounded overflow-hidden bg-surface-lowest">
									<span className="shimmer-sweep absolute inset-0" aria-hidden="true" />
								</div>
							</div>
						))}
					</div>
				) : isPaidPlan && usageStats ? (
					/* Real usage bars */
					<>
						<div className="flex flex-col gap-3">
							{rows.map(({ label, key }) => {
								const { used, limit } = usageStats[key]
								const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
								return (
									<div key={key} className="flex flex-col gap-1">
										<div className="flex items-center justify-between">
											<span className="text-label text-on-surface">{label}</span>
											<span className="text-label text-on-surface-muted">
												{used} / {limit}
											</span>
										</div>
										<div className="h-1.5 rounded bg-surface-lowest overflow-hidden">
											<div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
										</div>
									</div>
								)
							})}
						</div>
						<div className="text-label text-on-surface-muted">
							Resets {formatResetsAt(usageStats.resets_at)}
						</div>
					</>
				) : (
					/* Free-plan CTA */
					<p className="text-body text-on-surface-muted">
						You're on the free plan. Upgrade to Domus Citizen for more agent turns, image
						generation, and web search.
					</p>
				)}
			</div>
		</section>
	)
}
