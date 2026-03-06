const COLORS: Record<string, string> = {
	sse: '#7c9ef8', // blue     – incoming SSE events
	action: '#f5a623', // orange   – agent action dispatch
	cdc: '#50e3c2', // teal     – Supabase CDC inbound
	db: '#bd10e0', // purple   – Supabase writes
	send: '#7ed321', // green    – messages sent to agent
	ui: '#e8e8e8', // white    – immediate UI store mutations
}

function isEnabled(): boolean {
	return (
		typeof window !== 'undefined' && (window as { __domusDebug?: boolean }).__domusDebug === true
	)
}

export function dbg(ns: keyof typeof COLORS, message: string, data?: unknown) {
	if (!isEnabled()) return
	const color = COLORS[ns] ?? '#aaa'
	if (data !== undefined) {
		console.log(`%c[${ns}]%c ${message}`, `color:${color};font-weight:bold`, 'color:inherit', data)
	} else {
		console.log(`%c[${ns}]%c ${message}`, `color:${color};font-weight:bold`, 'color:inherit')
	}
}
