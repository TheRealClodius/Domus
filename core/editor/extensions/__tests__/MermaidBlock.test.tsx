// core/editor/extensions/__tests__/MermaidBlock.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { MermaidBlock } from '@/core/editor/extensions/MermaidBlock'

function TestEditor({ content }: { content: Record<string, unknown> }) {
	const editor = useEditor({
		extensions: [StarterKit, MermaidBlock],
		content,
	})
	return (
		<div data-testid="test-editor">
			<EditorContent editor={editor} />
		</div>
	)
}

describe('MermaidBlock', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders mermaid node view wrapper', () => {
		const content = {
			type: 'doc',
			content: [
				{
					type: 'mermaidBlock',
					attrs: { source: 'graph TD; A-->B;' },
				},
			],
		}
		render(<TestEditor content={content} />)
		expect(screen.getByTestId('test-editor').querySelector('[data-mermaid-block]')).not.toBeNull()
	})
})
