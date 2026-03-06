/**
 * Shared animation-skip state for canvas entities.
 *
 * Extracted from SpaceRenderer.tsx so entityStore.ts can import it
 * without creating a circular dependency.
 *
 * Used to suppress Framer Motion's spring transition after a user gesture
 * (drag / resize) where direct DOM manipulation has already moved the element
 * to the final position — without suppression, Framer Motion would animate
 * from the old store position to the new one (snap-back bug).
 */
const skipAnimationIds = new Set<string>()

export const beginSkipAnimation = (id: string) => skipAnimationIds.add(id)
export const endSkipAnimation = (id: string) => skipAnimationIds.delete(id)
export const isSkipAnimation = (id: string) => skipAnimationIds.has(id)
