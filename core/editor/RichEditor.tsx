'use client'

import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { Entity } from '@/lib/types'

function parseContent(content: string): string | Record<string, unknown> {
	if (!content) return ''
	try {
		const parsed = JSON.parse(content)
		if (parsed?.type === 'doc') return parsed
		return content
	} catch {
		return content
	}
}

interface RichEditorProps {
	entity: Entity
}

export default function RichEditor({ entity }: RichEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Image,
			Placeholder.configure({
				placeholder: 'Start writing...',
			}),
		],
		content: parseContent(entity.content),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
			},
		},
		// TODO: debounced save to entityStore on update (Task 12)
	})

	return (
		<div data-testid="rich-editor">
			<EditorContent editor={editor} />
		</div>
	)
}
