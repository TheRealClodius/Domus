'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

interface IframeSandboxProps {
	entity: Entity
}

export function IframeSandbox({ entity }: IframeSandboxProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const updateState = useEntityStore((s) => s.updateState)
	const readyRef = useRef(false)

	const code = entity.state?._code as string | undefined
	const meta = entity.state?._meta as { name?: string } | undefined

	// Extract runtime state (non-_ keys)
	const getRuntimeState = useCallback(() => {
		const rs: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(entity.state ?? {})) {
			if (!k.startsWith('_')) rs[k] = v
		}
		return rs
	}, [entity.state])

	// Send init to iframe
	const sendInit = useCallback(() => {
		if (!iframeRef.current?.contentWindow || !code) return
		iframeRef.current.contentWindow.postMessage(
			{
				type: 'init',
				code,
				state: getRuntimeState(),
			},
			'*',
		)
	}, [code, getRuntimeState])

	// Listen for messages from iframe
	useEffect(() => {
		const handler = (e: MessageEvent) => {
			if (e.source !== iframeRef.current?.contentWindow) return

			switch (e.data?.type) {
				case 'ready':
					readyRef.current = true
					sendInit()
					break

				case 'stateSync': {
					// Preserve system keys, merge runtime state from iframe
					const current = useEntityStore.getState().entities[entity.id]?.state ?? {}
					const systemKeys: Record<string, unknown> = {}
					for (const [k, v] of Object.entries(current)) {
						if (k.startsWith('_')) systemKeys[k] = v
					}
					const newState = { ...systemKeys, ...e.data.state }
					const summary = meta?.name ?? entity.summary
					updateState(entity.id, newState, summary)
					break
				}

				case 'error':
					console.error('[IframeSandbox] Error:', e.data.message)
					break
			}
		}

		window.addEventListener('message', handler)
		return () => window.removeEventListener('message', handler)
	}, [entity.id, entity.summary, meta?.name, updateState, sendInit])

	// Re-send init when code changes (hot reload)
	useEffect(() => {
		if (readyRef.current) sendInit()
	}, [sendInit])

	return (
		<iframe
			ref={iframeRef}
			src="/sandbox"
			sandbox="allow-scripts"
			className="w-full h-full border-0"
			title={meta?.name ?? 'Generated App'}
		/>
	)
}
