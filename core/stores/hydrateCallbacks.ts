type HydrateCallback = () => void

let onHydrate: HydrateCallback | null = null

export function registerHydrateCallback(cb: HydrateCallback): void {
	onHydrate = cb
}

export function notifyHydrated(): void {
	onHydrate?.()
}
