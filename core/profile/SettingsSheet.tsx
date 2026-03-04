'use client'

import { Calendar, Camera, CreditCard, Link, Palette, Settings, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGoogleCalendarConnection } from '@/apps/calendar/useGoogleCalendarConnection'
import ConnectionRow from '@/core/profile/ConnectionRow'
import AppearanceSection from '@/core/profile/sections/AppearanceSection'
import { useGoogleDriveConnection } from '@/core/profile/useGoogleDriveConnection'
import { useProfile, useProfileStore } from '@/core/profile/useProfile'
import { Button } from '@/core/ui/button'
import GoogleDriveIcon from '@/core/ui/icons/google-drive'
import { SPRING } from '@/lib/motion'

export type SettingsSection = 'general' | 'appearance' | 'connections' | 'billing' | 'usage'

interface SettingsSheetProps {
	initialSection?: string | null
}

const NAV_ITEMS: {
	id: SettingsSection
	label: string
	icon: React.ComponentType<{ size?: number; className?: string }>
}[] = [
	{ id: 'general', label: 'General', icon: Settings },
	{ id: 'appearance', label: 'Appearance', icon: Palette },
	{ id: 'connections', label: 'Connections', icon: Link },
	{ id: 'billing', label: 'Billing', icon: CreditCard },
	{ id: 'usage', label: 'Usage', icon: Zap },
]

function toValidSection(s: string | null | undefined): SettingsSection {
	const valid: SettingsSection[] = ['general', 'appearance', 'connections', 'billing', 'usage']
	return valid.includes(s as SettingsSection) ? (s as SettingsSection) : 'general'
}

export default function SettingsSheet({ initialSection }: SettingsSheetProps) {
	const [activeSection, setActiveSection] = useState<SettingsSection>(
		toValidSection(initialSection),
	)
	return (
		<div className="flex h-full gap-6 px-6 py-5 overflow-auto justify-center">
			{/* Sidebar — floating card */}
			<nav className="w-44 shrink-0 flex flex-col gap-1 rounded-xl bg-surface px-3 py-3 h-fit">
				{NAV_ITEMS.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type="button"
						data-testid={`settings-nav-${id}`}
						className={
							'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-body text-left transition-colors ' +
							(activeSection === id
								? 'bg-surface-lowest text-on-surface font-medium'
								: 'text-on-surface-muted hover:bg-surface-bright')
						}
						onClick={() => setActiveSection(id)}
					>
						<Icon size={14} className="shrink-0" />
						{label}
					</button>
				))}
			</nav>

			{/* Content */}
			<div className="w-full max-w-xl py-1">
				<SectionContent section={activeSection} />
			</div>
		</div>
	)
}

function SectionContent({ section }: { section: SettingsSection }) {
	const { profile, isLoading, updateName, updateCustomInstruction, updateAvatar } = useProfile()

	if (section === 'appearance') {
		return <AppearanceSection />
	}

	if (section === 'connections') {
		return <ConnectionsSection />
	}

	if (isLoading) {
		return <p className="text-body text-on-surface-muted">Loading profile…</p>
	}

	if (!profile) {
		return <p className="text-body text-on-surface-muted">Unable to load profile.</p>
	}

	if (section === 'general') {
		return (
			<GeneralSection
				profile={profile}
				updateName={updateName}
				updateCustomInstruction={updateCustomInstruction}
				updateAvatar={updateAvatar}
			/>
		)
	}

	if (section === 'billing') {
		return <BillingSection profile={profile} />
	}

	if (section === 'usage') {
		return <UsageSection />
	}

	return null
}

/* ── General ────────────────────────────────────────────── */

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((part) => part[0])
		.filter(Boolean)
		.slice(0, 2)
		.join('')
		.toUpperCase()
}

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
		<div className="flex flex-col gap-6">
			{/* Profile Header */}
			<section className="flex items-center gap-4">
				<div className="relative">
					<button
						type="button"
						data-testid="avatar-upload"
						className="group flex size-16 items-center justify-center rounded-full bg-surface text-title-sm font-medium text-on-surface overflow-hidden border-2 border-outline-variant"
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
		</div>
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

type PlanDef =
	| {
			id: 'free' | 'citizen'
			label: string
			price?: string
			messages: number
			searches: number
			images: number
	  }
	| { id: 'extra'; label: string; payg: true }

const PLANS: PlanDef[] = [
	{ id: 'free', label: 'Domus Free', messages: 10, searches: 5, images: 0 },
	{
		id: 'citizen',
		label: 'Domus Citizen',
		price: '€20/mo',
		messages: 200,
		searches: 50,
		images: 20,
	},
	{ id: 'extra', label: 'Domus Extra', payg: true },
]

function formatDate(dateStr: string | null): string {
	if (!dateStr) return '—'
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function BillingSection({
	profile,
}: {
	profile: NonNullable<ReturnType<typeof useProfile>['profile']>
}) {
	const updatePlan = useProfileStore((s) => s.updatePlan)
	const updateExtraBudget = useProfileStore((s) => s.updateExtraBudget)
	const [switching, setSwitching] = useState<string | null>(null)
	const [budgetInput, setBudgetInput] = useState<string>('')
	const [savingBudget, setSavingBudget] = useState(false)
	const currentPlan = profile.plan ?? 'free'

	// Sync input when profile loads or changes
	useEffect(() => {
		setBudgetInput(profile.extraBudget != null ? String(profile.extraBudget) : '')
	}, [profile.extraBudget])

	const savedBudgetStr = profile.extraBudget != null ? String(profile.extraBudget) : ''
	const isBudgetDirty = budgetInput !== savedBudgetStr

	const handleSwitch = async (planId: 'free' | 'citizen' | 'extra') => {
		setSwitching(planId)
		try {
			await updatePlan(planId)
		} finally {
			setSwitching(null)
		}
	}

	const handleSaveBudget = async () => {
		const trimmed = budgetInput.trim()
		const parsed = trimmed === '' ? null : Number(trimmed)
		if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return
		setSavingBudget(true)
		try {
			await updateExtraBudget(parsed)
		} finally {
			setSavingBudget(false)
		}
	}

	return (
		<section>
			<div className="flex flex-col gap-3">
				{PLANS.map((plan) => {
					const isActive = currentPlan === plan.id
					return (
						<div
							key={plan.id}
							className={`rounded-lg border bg-surface px-4 py-3 flex items-start justify-between gap-3 ${
								isActive ? 'border-primary' : 'border-outline-variant'
							}`}
						>
							<div className="flex flex-col gap-0.5 min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="text-body font-medium text-on-surface">{plan.label}</span>
									{'price' in plan && plan.price && (
										<span className="text-label text-on-surface-muted">{plan.price}</span>
									)}
									{isActive && (
										<span className="bg-pill-active text-white text-label px-2 py-0.5 rounded-full border border-white/30">
											Current Plan
										</span>
									)}
								</div>
								{'payg' in plan ? (
									<>
										<div className="text-label text-on-surface-muted">
											Citizen limits + unlimited usage
										</div>
										<div className="text-label text-on-surface-muted">
											Billed weekly for additional usage
										</div>
										{isActive && (
											<div className="mt-2 flex items-center gap-2">
												<label
													htmlFor="extra-budget"
													className="text-label text-on-surface-muted shrink-0"
												>
													Monthly cap
												</label>
												<div className="flex items-center gap-1.5">
													<span className="text-label text-on-surface-muted">€</span>
													<input
														id="extra-budget"
														type="number"
														min="0"
														step="1"
														placeholder="No limit"
														value={budgetInput}
														onChange={(e) => setBudgetInput(e.target.value)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') handleSaveBudget()
														}}
														className="w-24 rounded-md border border-outline-variant bg-surface-high px-2 py-1 text-body text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
													/>
												</div>
												{isBudgetDirty && (
													<Button
														variant="ghost"
														size="sm"
														disabled={savingBudget}
														onClick={handleSaveBudget}
													>
														{savingBudget ? '…' : 'Save'}
													</Button>
												)}
											</div>
										)}
									</>
								) : (
									<>
										<div className="text-label text-on-surface-muted">
											{plan.messages} messages · {plan.searches} searches
										</div>
										<div className="text-label text-on-surface-muted">
											{plan.images === 0 ? 'No image generation' : `${plan.images} images/month`}
										</div>
									</>
								)}
								{isActive && profile.planPeriodStart && (
									<div className="mt-1 text-label text-on-surface-muted">
										{formatDate(profile.planPeriodStart)} – {formatDate(profile.planPeriodEnd)}
									</div>
								)}
							</div>
							{!isActive && (
								<Button
									variant="ghost"
									size="sm"
									disabled={switching !== null}
									onClick={() => handleSwitch(plan.id)}
								>
									{switching === plan.id ? '…' : `Switch to ${plan.label.replace('Domus ', '')}`}
								</Button>
							)}
						</div>
					)
				})}
			</div>
		</section>
	)
}

/* ── Usage ─────────────────────────────────────────────── */

function AnimatedBar({ pct }: { pct: number }) {
	return (
		<motion.div
			className="h-full rounded bg-primary"
			initial={{ width: '0%' }}
			animate={{ width: `${pct}%` }}
			transition={SPRING.bar}
		/>
	)
}

function UsageSection() {
	const fetchUsage = useProfileStore((s) => s.fetchUsage)
	const usageStats = useProfileStore((s) => s.usageStats)
	const profile = useProfileStore((s) => s.profile)
	const updateExtraBudget = useProfileStore((s) => s.updateExtraBudget)
	const [budgetInput, setBudgetInput] = useState<string>('')
	const [savingBudget, setSavingBudget] = useState(false)

	useEffect(() => {
		fetchUsage()
	}, [fetchUsage])

	useEffect(() => {
		setBudgetInput(profile?.extraBudget != null ? String(profile.extraBudget) : '')
	}, [profile?.extraBudget])

	const handleSaveBudget = async () => {
		const trimmed = budgetInput.trim()
		const parsed = trimmed === '' ? null : Number(trimmed)
		if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return
		setSavingBudget(true)
		try {
			await updateExtraBudget(parsed)
		} finally {
			setSavingBudget(false)
		}
	}

	const savedBudgetStr = profile?.extraBudget != null ? String(profile.extraBudget) : ''
	const isBudgetDirty = budgetInput !== savedBudgetStr

	const isPaidPlan = usageStats?.plan != null
	const showFreeCTA = usageStats !== null && !isPaidPlan
	const isPayg = usageStats?.is_payg ?? false

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
				{showFreeCTA ? (
					<p className="text-body text-on-surface-muted">
						You're on the free plan. Upgrade to Domus Citizen for more agent turns, image
						generation, and web search.
					</p>
				) : (
					<>
						{isPayg && (
							<p className="text-label text-on-surface-muted">
								Citizen base included · usage beyond limits billed weekly
							</p>
						)}
						<div className="flex flex-col gap-3">
							{rows.map(({ label, key }) => {
								const stat = usageStats?.[key]
								const isOver = isPayg && stat != null && stat.used > stat.limit
								const pct =
									stat && stat.limit > 0
										? Math.min(100, Math.round((stat.used / stat.limit) * 100))
										: 0
								return (
									<div key={key} className="flex flex-col gap-1">
										<div className="flex items-center justify-between">
											<span className="text-body text-on-surface">{label}</span>
											{stat && (
												<span className="text-body text-on-surface-muted">
													{stat.used} / {stat.limit}
													{isOver && (
														<span className="ml-1 text-label text-primary">
															+{stat.used - stat.limit} billed
														</span>
													)}
												</span>
											)}
										</div>
										<div className="h-1.5 rounded bg-surface-lowest overflow-hidden">
											<AnimatedBar pct={pct} />
										</div>
									</div>
								)
							})}
						</div>
						{usageStats?.resets_at && (
							<div className="text-label text-on-surface-muted">
								Resets {formatResetsAt(usageStats.resets_at)}
							</div>
						)}
						{isPayg && (
							<div className="flex items-center gap-2 pt-1 border-t border-outline-variant">
								<label
									htmlFor="usage-extra-budget"
									className="text-label text-on-surface-muted shrink-0"
								>
									Monthly cap
								</label>
								<span className="text-label text-on-surface-muted">€</span>
								<input
									id="usage-extra-budget"
									type="number"
									min="0"
									step="1"
									placeholder="No limit"
									value={budgetInput}
									onChange={(e) => setBudgetInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') handleSaveBudget()
									}}
									className="w-24 rounded-md border border-outline-variant bg-surface-high px-2 py-1 text-body text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
								/>
								{isBudgetDirty && (
									<Button
										variant="ghost"
										size="sm"
										disabled={savingBudget}
										onClick={handleSaveBudget}
									>
										{savingBudget ? '…' : 'Save'}
									</Button>
								)}
							</div>
						)}
					</>
				)}
			</div>
		</section>
	)
}
