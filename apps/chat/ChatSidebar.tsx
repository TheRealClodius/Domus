'use client'

import { Copy, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { ChatUserProfile } from '@/apps/chat/chatStore'
import GroupListItem from '@/apps/chat/GroupListItem'
import type { ChatGroup } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'

interface GroupsModeProps {
	mode: 'groups'
	groups: ChatGroup[]
	activeGroupId: string | null
	unreadCounts: Record<string, number>
	lastMessages?: Record<string, { preview: string; timestamp: string }>
	dmPartners: Record<string, string>
	profiles: Record<string, ChatUserProfile>
	onSelectGroup: (groupId: string) => void
	onOpenJoinModal: () => void
	onOpenCreateModal: () => void
	onOpenNewDM: () => void
	onClose: () => void
}

interface SettingsModeProps {
	mode: 'settings'
	activeGroup: ChatGroup
	userId: string
	onDelete: () => Promise<void>
	onClose: () => void
}

type ChatSidebarProps = GroupsModeProps | SettingsModeProps

export default function ChatSidebar(props: ChatSidebarProps) {
	if (props.mode === 'settings') {
		return (
			<SettingsPanel
				activeGroup={props.activeGroup}
				userId={props.userId}
				onDelete={props.onDelete}
			/>
		)
	}

	return (
		<GroupsPanel
			groups={props.groups}
			activeGroupId={props.activeGroupId}
			unreadCounts={props.unreadCounts}
			lastMessages={props.lastMessages}
			dmPartners={props.dmPartners}
			profiles={props.profiles}
			onSelectGroup={props.onSelectGroup}
			onOpenJoinModal={props.onOpenJoinModal}
			onOpenCreateModal={props.onOpenCreateModal}
			onOpenNewDM={props.onOpenNewDM}
		/>
	)
}

function GroupsPanel({
	groups,
	activeGroupId,
	unreadCounts,
	lastMessages = {},
	dmPartners,
	profiles,
	onSelectGroup,
	onOpenJoinModal,
	onOpenCreateModal,
	onOpenNewDM,
}: Omit<GroupsModeProps, 'mode' | 'onClose'>) {
	return (
		<div className="h-full relative overflow-hidden bg-surface">
			{/* Tonal top fade */}
			<div
				aria-hidden
				className="absolute inset-x-0 top-0 h-6 z-10 pointer-events-none bg-gradient-to-b from-surface to-transparent"
			/>
			<div className="h-full overflow-auto">
				<div className="flex flex-col gap-1 px-2 py-6">
					{/* Action buttons */}
					<button
						type="button"
						onClick={onOpenNewDM}
						className="flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-on-surface/8"
					>
						<div className="size-[47px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Search className="size-5 text-primary" />
						</div>
						<p className="text-[14px] font-semibold leading-5 text-on-surface">New message</p>
					</button>
					<button
						type="button"
						onClick={onOpenJoinModal}
						className="flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-on-surface/8"
					>
						<div className="size-[47px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<UserPlus className="size-5 text-primary" />
						</div>
						<p className="text-[14px] font-semibold leading-5 text-on-surface">Join group</p>
					</button>
					<button
						type="button"
						onClick={onOpenCreateModal}
						className="flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-on-surface/8"
					>
						<div className="size-[47px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Plus className="size-5 text-primary" />
						</div>
						<p className="text-[14px] font-semibold leading-5 text-on-surface">New group</p>
					</button>

					{/* Group list */}
					{groups.map((group) => {
						const last = lastMessages[group.id]
						const partnerId = dmPartners[group.id]
						const partnerProfile = partnerId ? profiles[partnerId] : undefined
						return (
							<GroupListItem
								key={group.id}
								group={group}
								isActive={group.id === activeGroupId}
								unreadCount={unreadCounts[group.id] ?? 0}
								preview={last?.preview}
								timestamp={last?.timestamp}
								dmPartnerProfile={partnerProfile}
								onClick={() => onSelectGroup(group.id)}
							/>
						)
					})}
				</div>
			</div>
			{/* Tonal bottom fade */}
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 h-6 z-10 pointer-events-none bg-gradient-to-t from-surface to-transparent"
			/>
		</div>
	)
}

function SettingsPanel({
	activeGroup,
	userId,
	onDelete,
}: {
	activeGroup: ChatGroup
	userId: string
	onDelete: () => Promise<void>
}) {
	const [copied, setCopied] = useState(false)
	const [confirming, setConfirming] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(activeGroup.invite_code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const handleDeleteConfirm = async () => {
		setDeleting(true)
		setDeleteError(null)
		try {
			await onDelete()
		} catch (err) {
			setDeleteError(err instanceof Error ? err.message : 'Failed to delete group')
			setDeleting(false)
		}
	}

	const isOwner = activeGroup.kind === 'group' && activeGroup.created_by === userId

	return (
		<div className="h-full relative overflow-hidden bg-surface">
			{/* Tonal top fade */}
			<div
				aria-hidden
				className="absolute inset-x-0 top-0 h-6 z-10 pointer-events-none bg-gradient-to-b from-surface to-transparent"
			/>
			<div className="h-full overflow-auto">
				<div className="px-3 py-6 space-y-4">
					<div>
						<p className="text-label text-on-surface-muted mb-1">Group name</p>
						<p className="text-body text-on-surface">{activeGroup.name}</p>
					</div>

					<div>
						<p className="text-label text-on-surface-muted mb-1">Invite code</p>
						<div className="flex items-center gap-2">
							<code className="text-body text-on-surface bg-surface px-2 py-1 rounded-md">
								{activeGroup.invite_code}
							</code>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={handleCopy}
								aria-label="Copy invite code"
							>
								<Copy className="size-3.5" />
							</Button>
							{copied && <span className="text-label text-on-surface-muted">Copied!</span>}
						</div>
					</div>

					{isOwner && (
						<div className="pt-2 border-t border-outline-variant">
							{!confirming ? (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setConfirming(true)}
									className="text-destructive hover:text-destructive hover:bg-destructive/8"
								>
									<Trash2 className="size-4" />
									Delete group
								</Button>
							) : (
								<div className="space-y-3">
									<p className="text-body-sm text-on-surface">
										Delete this group? All messages will be permanently removed.
									</p>
									{deleteError && <p className="text-label text-error">{deleteError}</p>}
									<div className="flex gap-2">
										<Button
											variant="destructive"
											size="sm"
											onClick={handleDeleteConfirm}
											disabled={deleting}
										>
											{deleting && (
												<span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
											)}
											Delete
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setConfirming(false)
												setDeleteError(null)
											}}
											disabled={deleting}
										>
											Cancel
										</Button>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
			{/* Tonal bottom fade */}
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 h-6 z-10 pointer-events-none bg-gradient-to-t from-surface to-transparent"
			/>
		</div>
	)
}
