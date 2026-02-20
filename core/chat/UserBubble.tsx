import { memo } from 'react'

export default memo(function UserBubble({ text }: { text: string }) {
	return (
		<div className="flex justify-end">
			<div className="max-w-[80%] rounded-2xl bg-surface-lowest px-3 py-2 text-body text-on-surface-muted">
				{text}
			</div>
		</div>
	)
})
