export default function UserBubble({ text }: { text: string }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[80%] rounded-2xl bg-surface-raised px-3 py-2 text-body text-on-surface-muted">
				{text}
			</div>
		</div>
	)
}
