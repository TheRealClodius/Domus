// core/editor/extensions/__tests__/MermaidBlock.test.tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import mermaid from 'mermaid'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MermaidBlock } from '@/core/editor/extensions/MermaidBlock'

// Mock mermaid so we can control the SVG output exactly
vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(() => Promise.resolve({ svg: '<svg><rect /></svg>' })),
	},
}))

function setMockSvg(svg: string) {
	vi.mocked(mermaid.render).mockResolvedValueOnce({ svg })
}

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

function makeMermaidDoc(source: string) {
	return {
		type: 'doc',
		content: [{ type: 'mermaidBlock', attrs: { source } }],
	}
}

describe('MermaidBlock', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('renders mermaid node view wrapper', () => {
		const content = makeMermaidDoc('graph TD; A-->B;')
		render(<TestEditor content={content} />)
		expect(screen.getByTestId('test-editor').querySelector('[data-mermaid-block]')).not.toBeNull()
	})

	it('renders valid mermaid source as SVG with no script tags', async () => {
		const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="50" /></svg>'
		setMockSvg(safeSvg)

		render(<TestEditor content={makeMermaidDoc('graph TD; A-->B;')} />)

		await waitFor(() => {
			const container = screen.getByTestId('test-editor').querySelector('[data-mermaid-block] div')
			expect(container).not.toBeNull()
			expect(container?.querySelector('svg')).not.toBeNull()
			expect(container?.querySelector('script')).toBeNull()
		})
	})

	it('strips <script> tags from SVG output', async () => {
		const maliciousSvg =
			'<svg xmlns="http://www.w3.org/2000/svg"><rect /><script>alert("xss")</script></svg>'
		setMockSvg(maliciousSvg)

		render(<TestEditor content={makeMermaidDoc('graph TD; A-->B;')} />)

		await waitFor(() => {
			const container = screen.getByTestId('test-editor').querySelector('[data-mermaid-block] div')
			expect(container).not.toBeNull()
			// SVG should be present but script tag should be stripped
			expect(container?.querySelector('svg')).not.toBeNull()
			expect(container?.querySelector('script')).toBeNull()
			expect(container?.innerHTML).not.toContain('<script')
			expect(container?.innerHTML).not.toContain('alert')
		})
	})

	it('strips onerror/onload event handlers from SVG elements', async () => {
		const maliciousSvg =
			'<svg xmlns="http://www.w3.org/2000/svg"><image onerror="alert(1)" onload="alert(2)" href="x" /><rect onclick="alert(3)" /></svg>'
		setMockSvg(maliciousSvg)

		render(<TestEditor content={makeMermaidDoc('graph TD; A-->B;')} />)

		await waitFor(() => {
			const container = screen.getByTestId('test-editor').querySelector('[data-mermaid-block] div')
			expect(container).not.toBeNull()
			const html = container?.innerHTML ?? ''
			expect(html).not.toContain('onerror')
			expect(html).not.toContain('onload')
			expect(html).not.toContain('onclick')
			expect(html).not.toContain('alert')
		})
	})
})
