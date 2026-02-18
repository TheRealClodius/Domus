'use client'

import { Copy, Plus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import GroupListItem from '@/apps/chat/GroupListItem'
import type { ChatGroup } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'

interface GroupsModeProps {
	mode: 'groups'
	groups: ChatGroup[]
	activeGroupId: string | null
	unreadCounts: Record<string, number>
	lastMessages?: Record<string, { preview: string; timestamp: string }>
	onSelectGroup: (groupId: string) => void
	onOpenJoinModal: () => void
	onOpenCreateModal: () => void
	onClose: () => void
}

interface SettingsModeProps {
	mode: 'settings'
	activeGroup: ChatGroup
	onClose: () => void
}

type ChatSidebarProps = GroupsModeProps | SettingsModeProps

export default function ChatSidebar(props: ChatSidebarProps) {
	if (props.mode === 'settings') {
		return <SettingsPanel activeGroup={props.activeGroup} />
	}

	return (
		<GroupsPanel
			groups={props.groups}
			activeGroupId={props.activeGroupId}
			unreadCounts={props.unreadCounts}
			lastMessages={props.lastMessages}
			onSelectGroup={props.onSelectGroup}
			onOpenJoinModal={props.onOpenJoinModal}
			onOpenCreateModal={props.onOpenCreateModal}
		/>
	)
}

function GroupsPanel({
	groups,
	activeGroupId,
	unreadCounts,
	lastMessages = {},
	onSelectGroup,
	onOpenJoinModal,
	onOpenCreateModal,
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
						onClick={onOpenJoinModal}
						className="flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-surface-sunken"
					>
						<div className="size-[47px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<UserPlus className="size-5 text-primary" />
						</div>
						<p className="text-[14px] font-semibold leading-5 text-on-surface">Join group</p>
					</button>
					<button
						type="button"
						onClick={onOpenCreateModal}
						className="flex w-full items-center gap-2 rounded-lg p-3 text-left transition-colors hover:bg-surface-sunken"
					>
						<div className="size-[47px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Plus className="size-5 text-primary" />
						</div>
						<p className="text-[14px] font-semibold leading-5 text-on-surface">New group</p>
					</button>

					{/* Group list */}
					{groups.map((group) => {
						const last = lastMessages[group.id]
						return (
							<GroupListItem
								key={group.id}
								group={group}
								isActive={group.id === activeGroupId}
								unreadCount={unreadCounts[group.id] ?? 0}
								preview={last?.preview}
								timestamp={last?.timestamp}
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

function SettingsPanel({ activeGroup }: { activeGroup: ChatGroup }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(activeGroup.invite_code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

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
							<code className="text-body text-on-surface bg-surface-sunken px-2 py-1 rounded-md">
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
