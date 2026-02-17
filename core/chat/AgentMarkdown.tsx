import ReactMarkdown from 'react-markdown'

export default function AgentMarkdown({ children }: { children: string }) {
	return (
		<div className="agent-markdown text-body text-on-surface">
			<ReactMarkdown>{children}</ReactMarkdown>
		</div>
	)
}
