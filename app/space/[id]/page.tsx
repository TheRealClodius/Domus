import { redirect } from 'next/navigation'
import CanvasShell from '@/core/canvas/CanvasShell'
import SpaceRenderer from '@/core/canvas/SpaceRenderer'
import AgentChat from '@/core/chat/AgentChat'
import SpaceSheet from '@/core/sheet/SpaceSheet'
import { getSupabaseServerClient } from '@/core/supabase/server'

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		redirect('/')
	}

	const { data: space } = await supabase.from('spaces').select('name').eq('id', id).single()
	const spaceName = space?.name ?? 'My Space'

	const userName = (user.user_metadata?.full_name as string) ?? ''
	const userAvatarUrl = (user.user_metadata?.avatar_url as string) ?? undefined
	const isAnonymous = user.is_anonymous === true

	return (
		<div className="h-screen bg-surface">
			<CanvasShell>
				<SpaceRenderer
					spaceId={id}
					userId={user.id}
					spaceName={spaceName}
					user={userName && !isAnonymous ? { name: userName, avatarUrl: userAvatarUrl } : undefined}
				/>
			</CanvasShell>
			<AgentChat spaceId={id} userId={user.id} />
			<SpaceSheet />
		</div>
	)
}
