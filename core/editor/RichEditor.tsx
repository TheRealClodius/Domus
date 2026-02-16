'use client'

import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { MermaidBlock } from '@/core/editor/extensions/MermaidBlock'
import { useEntityStore } from '@/core/entityStore'
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
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit,
			Image,
			Placeholder.configure({
				placeholder: 'Start writing...',
			}),
			MermaidBlock,
		],
		content: parseContent(entity.content),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
			},
		},
		onUpdate: ({ editor }) => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
			saveTimerRef.current = setTimeout(() => {
				const json = JSON.stringify(editor.getJSON())
				useEntityStore.getState().updateContent(entity.id, json)
			}, 300)
		},
	})

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
		}
	}, [])

	return (
		<div data-testid="rich-editor">
			<EditorContent editor={editor} />
		</div>
	)
}
