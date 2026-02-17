import { mergeAttributes, Node } from '@tiptap/core'
import { type NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
import { useEffect, useRef, useState } from 'react'

mermaid.initialize({ startOnLoad: false, theme: 'neutral' })

function MermaidNodeView({ node }: NodeViewProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [error, setError] = useState<string | null>(null)
	const source = node.attrs.source as string

	useEffect(() => {
		if (!source || !containerRef.current) return

		let cancelled = false
		const id = `mermaid-${Math.random().toString(36).slice(2)}`

		mermaid
			.render(id, source)
			.then(({ svg }) => {
				if (!cancelled && containerRef.current) {
					containerRef.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })
					setError(null)
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err.message || 'Failed to render diagram')
				}
			})

		return () => {
			cancelled = true
		}
	}, [source])

	// TODO: clicking the rendered diagram could toggle source view (future)
	return (
		<NodeViewWrapper data-mermaid-block="">
			{error ? (
				<div className="p-3 text-sm text-error bg-surface-sunken rounded-lg">{error}</div>
			) : (
				<div ref={containerRef} className="flex justify-center py-2" />
			)}
		</NodeViewWrapper>
	)
}

export const MermaidBlock = Node.create({
	name: 'mermaidBlock',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			source: { default: '' },
		}
	},

	parseHTML() {
		return [{ tag: 'div[data-mermaid-block]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid-block': '' })]
	},

	addNodeView() {
		return ReactNodeViewRenderer(MermaidNodeView)
	},
})
