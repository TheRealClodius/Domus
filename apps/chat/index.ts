import { MessageSquare } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import ChatApp from '@/apps/chat/ChatApp'

export const chatApp: BuiltInApp = {
	source: 'built-in',
	type: 'chat',
	name: 'Chat',
	icon: MessageSquare,
	component: ChatApp,
	defaultPresentation: 'window',
	defaultSize: { width: 400, height: 500 },
	maxInstances: 1,
	reduce: (state) => state,
	summarize: () => 'Chat conversation',
}
