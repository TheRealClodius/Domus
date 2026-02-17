const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 20

const windows = new Map<string, { count: number; start: number }>()

export function checkRateLimit(userId: string): { allowed: boolean } {
	const now = Date.now()
	const entry = windows.get(userId)
	if (!entry || now - entry.start > WINDOW_MS) {
		windows.set(userId, { count: 1, start: now })
		return { allowed: true }
	}
	entry.count++
	if (entry.count > MAX_REQUESTS) {
		return { allowed: false }
	}
	return { allowed: true }
}
