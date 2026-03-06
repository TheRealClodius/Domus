import { FileText } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { BuiltInApp } from '@/apps/_types'

const NoteCard = dynamic(() => import('@/apps/notes/NoteCard'))

export const noteApp: BuiltInApp = {
	source: 'built-in',
	type: 'note',
	name: 'Note',
	description:
		'Rich text note. Content is stored in entity.content (not state). After creating a note, call open_sheet to open it so the user can edit it in the rich editor.',
	icon: FileText,
	component: NoteCard,
	defaultPresentation: 'card',
	defaultSize: { width: 232, height: 300 },
	reduce: (state) => state,
	summarize: () => '',
	summarizeOn: [],
}
