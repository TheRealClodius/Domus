import { redirect } from 'next/navigation'
import CanvasShell from '@/core/canvas/CanvasShell'
import MockDataLoader from '@/core/canvas/MockDataLoader'
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

	return (
		<div className="h-screen bg-surface">
			<MockDataLoader />
			<CanvasShell>
				<SpaceRenderer spaceId={id} />
			</CanvasShell>
			<AgentChat spaceId={id} userId={user.id} />
			<SpaceSheet />
		</div>
	)
}
