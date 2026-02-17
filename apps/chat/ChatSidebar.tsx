'use client'

import { useState } from 'react'
import { Copy, Plus, X } from 'lucide-react'
import { Button } from '@/core/ui/button'
import GroupListItem from '@/apps/chat/GroupListItem'
import type { ChatGroup } from '@/apps/chat/types'

interface GroupsModeProps {
	mode: 'groups'
	groups: ChatGroup[]
	activeGroupId: string | null
	unreadCounts: Record<string, number>
	onSelectGroup: (groupId: string) => void
	onCreateGroup: (name: string) => void
	onJoinGroup: (code: string) => void
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
		return <SettingsPanel activeGroup={props.activeGroup} onClose={props.onClose} />
	}

	return (
		<GroupsPanel
			groups={props.groups}
			activeGroupId={props.activeGroupId}
			unreadCounts={props.unreadCounts}
			onSelectGroup={props.onSelectGroup}
			onCreateGroup={props.onCreateGroup}
			onJoinGroup={props.onJoinGroup}
			onClose={props.onClose}
		/>
	)
}

function GroupsPanel({
	groups,
	activeGroupId,
	unreadCounts,
	onSelectGroup,
	onCreateGroup,
	onJoinGroup,
	onClose,
}: Omit<GroupsModeProps, 'mode'>) {
	const [showCreate, setShowCreate] = useState(false)
	const [showJoin, setShowJoin] = useState(false)
	const [inputValue, setInputValue] = useState('')

	const handleCreate = () => {
		const name = inputValue.trim()
		if (!name) return
		onCreateGroup(name)
		setInputValue('')
		setShowCreate(false)
	}

	const handleJoin = () => {
		const code = inputValue.trim()
		if (!code) return
		onJoinGroup(code)
		setInputValue('')
		setShowJoin(false)
	}

	return (
		<div className="flex flex-col h-full bg-surface-raised">
			<div className="flex items-center justify-between px-3 py-2 border-b border-outline">
				<h2 className="text-body font-medium text-on-surface">Chats</h2>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded-md hover:bg-surface-sunken text-on-surface-muted"
					aria-label="Close sidebar"
				>
					<X className="size-4" />
				</button>
			</div>

			<div className="flex-1 overflow-auto py-1">
				{groups.map((group) => (
					<GroupListItem
						key={group.id}
						group={group}
						isActive={group.id === activeGroupId}
						unreadCount={unreadCounts[group.id] ?? 0}
						onClick={() => onSelectGroup(group.id)}
					/>
				))}
			</div>

			{(showCreate || showJoin) && (
				<div className="px-3 py-2 border-t border-outline">
					<input
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						placeholder={showCreate ? 'Group name...' : 'Invite code...'}
						className="w-full rounded-md bg-surface-sunken px-2 py-1.5 text-body text-on-surface placeholder:text-on-surface-muted outline-none mb-2"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								showCreate ? handleCreate() : handleJoin()
							}
						}}
					/>
					<div className="flex gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={showCreate ? handleCreate : handleJoin}
						>
							{showCreate ? 'Create' : 'Join'}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setShowCreate(false)
								setShowJoin(false)
								setInputValue('')
							}}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{!showCreate && !showJoin && (
				<div className="flex gap-2 px-3 py-2 border-t border-outline">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setShowJoin(false)
							setShowCreate(true)
						}}
						aria-label="New group"
					>
						<Plus className="size-3.5" />
						New group
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setShowCreate(false)
							setShowJoin(true)
						}}
						aria-label="Join group"
					>
						Join
					</Button>
				</div>
			)}
		</div>
	)
}

function SettingsPanel({
	activeGroup,
	onClose,
}: {
	activeGroup: ChatGroup
	onClose: () => void
}) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(activeGroup.invite_code)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="flex flex-col h-full bg-surface-raised">
			<div className="flex items-center justify-between px-3 py-2 border-b border-outline">
				<h2 className="text-body font-medium text-on-surface">Settings</h2>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded-md hover:bg-surface-sunken text-on-surface-muted"
					aria-label="Close sidebar"
				>
					<X className="size-4" />
				</button>
			</div>

			<div className="flex-1 overflow-auto px-3 py-3 space-y-4">
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
						{copied && (
							<span className="text-label text-on-surface-muted">Copied!</span>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
