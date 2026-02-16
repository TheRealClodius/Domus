import { redirect } from 'next/navigation'

export default function Home() {
	// TODO: Redirect to user's active_space_id when users table exists
	redirect('/space/default')
}
