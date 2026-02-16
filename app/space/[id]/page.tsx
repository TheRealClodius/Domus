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

	const userId = user?.id
	const userName = (user?.user_metadata?.full_name as string) ?? ''
	const userAvatarUrl = (user?.user_metadata?.avatar_url as string) ?? undefined

	return (
		<div className="h-screen bg-surface">
			<CanvasShell>
				<SpaceRenderer
					spaceId={id}
					userId={userId}
					user={userName ? { name: userName, avatarUrl: userAvatarUrl } : undefined}
				/>
			</CanvasShell>
			<AgentChat spaceId={id} userId={userId ?? 'guest'} />
			<SpaceSheet />
		</div>
	)
}
