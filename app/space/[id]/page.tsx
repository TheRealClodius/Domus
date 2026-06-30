import { notFound, redirect } from 'next/navigation'
import CanvasShell from '@/core/canvas/CanvasShell'
import SpaceHydrator from '@/core/canvas/SpaceHydrator'
import SpaceRenderer from '@/core/canvas/SpaceRenderer'
import AgentChat from '@/core/agent-chat/AgentChat'
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

	const [{ data: space }, { data: entities }] = await Promise.all([
		supabase.from('spaces').select('name').eq('id', id).single(),
		supabase.from('entities').select('*').eq('space_id', id).eq('archived', false),
	])
	if (!space) notFound()
	const spaceName = space.name ?? 'My Space'

	const userName = (user.user_metadata?.full_name as string) ?? ''
	const userAvatarUrl = (user.user_metadata?.avatar_url as string) ?? undefined

	return (
		<div className="h-screen bg-surface">
			<CanvasShell>
				<SpaceHydrator key={id} entities={entities ?? []} spaceId={id} />
				<SpaceRenderer
					spaceId={id}
					userId={user.id}
					spaceName={spaceName}
					user={userName ? { name: userName, avatarUrl: userAvatarUrl } : undefined}
				/>
			</CanvasShell>
			<AgentChat spaceId={id} userId={user.id} />
			<SpaceSheet />
		</div>
	)
}
