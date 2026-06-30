import { isSkipAnimation } from '@/core/canvas/animationState'
import { SPRING } from '@/lib/motion'

/** Monotonically increasing — bumped on each turn reset so stale marks are ignored. */
let turnGeneration = 0

const partingIds = new Set<string>()
const scatteringIds = new Set<string>()
const scatterDelayMap = new Map<string, number>()
const gatheringIds = new Set<string>()
const gatherRotationMap = new Map<string, number>()

/** Rotation targets matching folder IDLE card angles */
const GATHER_ROTATIONS = [-20, 0, 20]

function clearAllMarks(): void {
	partingIds.clear()
	scatteringIds.clear()
	scatterDelayMap.clear()
	gatheringIds.clear()
	gatherRotationMap.clear()
}

/** Start a new agent turn — clears stale animation marks and returns the new generation. */
export function resetTurn(): number {
	turnGeneration++
	clearAllMarks()
	return turnGeneration
}

export function getTurnGeneration(): number {
	return turnGeneration
}

export function markParting(ids: string[]): void {
	const gen = turnGeneration
	for (const id of ids) partingIds.add(id)
	setTimeout(() => {
		if (gen !== turnGeneration) return
		for (const id of ids) partingIds.delete(id)
	}, 0)
}

export function markScattering(ids: string[], staggerMs = 40): void {
	const gen = turnGeneration
	for (const id of ids) {
		gatheringIds.delete(id)
		gatherRotationMap.delete(id)
	}
	for (let i = 0; i < ids.length; i++) {
		scatteringIds.add(ids[i])
		scatterDelayMap.set(ids[i], (i * staggerMs) / 1000)
	}
	setTimeout(() => {
		if (gen !== turnGeneration) return
		for (const id of ids) {
			scatteringIds.delete(id)
			scatterDelayMap.delete(id)
		}
	}, 0)
}

export function markGathering(ids: string[]): void {
	const gen = turnGeneration
	gatheringIds.clear()
	gatherRotationMap.clear()
	for (let i = 0; i < ids.length; i++) {
		gatheringIds.add(ids[i])
		gatherRotationMap.set(ids[i], GATHER_ROTATIONS[i % GATHER_ROTATIONS.length])
	}
	setTimeout(() => {
		if (gen !== turnGeneration) return
		for (const id of ids) {
			gatheringIds.delete(id)
			gatherRotationMap.delete(id)
		}
	}, 800)
}

export function isGathering(entityId: string): boolean {
	return gatheringIds.has(entityId)
}

export function getGatherRotation(entityId: string): number {
	return gatherRotationMap.get(entityId) ?? 0
}

export function getEntityTransition(entityId: string) {
	if (isSkipAnimation(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.popIn,
			y: SPRING.popIn,
			left: { duration: 0 },
			top: { duration: 0 },
			width: { duration: 0 },
			height: { duration: 0 },
		}
	}
	if (partingIds.has(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.popIn,
			y: SPRING.popIn,
			left: SPRING.part,
			top: SPRING.part,
			width: SPRING.part,
			height: SPRING.part,
		}
	}
	if (scatteringIds.has(entityId)) {
		const delay = scatterDelayMap.get(entityId) ?? 0
		return {
			opacity: SPRING.popIn,
			scale: { ...SPRING.folder, delay },
			y: { duration: 0 },
			left: { ...SPRING.folder, delay },
			top: { ...SPRING.folder, delay },
			width: { ...SPRING.folder, delay },
			height: { ...SPRING.folder, delay },
		}
	}
	if (gatheringIds.has(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.folder,
			rotate: SPRING.folder,
			y: SPRING.popIn,
			left: SPRING.folder,
			top: SPRING.folder,
			width: SPRING.folder,
			height: SPRING.folder,
		}
	}
	return {
		opacity: SPRING.popIn,
		scale: SPRING.popIn,
		y: SPRING.popIn,
		left: SPRING.agent,
		top: SPRING.agent,
		width: SPRING.agent,
		height: SPRING.agent,
	}
}
