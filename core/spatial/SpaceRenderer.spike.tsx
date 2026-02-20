/**
 * SPIKE CODE — prototype of animated repositioning in SpaceRenderer.
 * This is NOT a replacement file — it shows the diff to the motion.div wrapper.
 *
 * Before (teleports):
 *   animate={{ opacity: 1, scale: 1, y: 0 }}
 *   style={{ position: 'absolute', left: X, top: Y, zIndex: Z }}
 *
 * After (animates):
 *   initial={{ opacity: 0, scale: 0.98, y: 8, left: X, top: Y }}
 *   animate={{ opacity: 1, scale: 1, y: 0, left: X, top: Y }}
 *   transition={{
 *     opacity: SPRING.popIn,
 *     scale: SPRING.popIn,
 *     left: SPRING.agent,
 *     top: SPRING.agent,
 *   }}
 *   style={{ position: 'absolute', zIndex: Z }}
 *
 * Key insight: per-property transitions let entrance (opacity+scale)
 * use a different spring than repositioning (left+top).
 *
 * The `initial` includes left+top so entities don't animate from (0,0)
 * on first render — they appear at their correct position immediately,
 * then only animate when position changes.
 */

// This would be the motion.div in SpaceRenderer line 109-121:
import { SPRING } from '@/lib/motion'

const ENTITY_TRANSITION = {
	// Entrance animation
	opacity: SPRING.popIn,
	scale: SPRING.popIn,
	y: SPRING.popIn,
	// Repositioning animation — different spring, smoother
	left: SPRING.agent,
	top: SPRING.agent,
}

// Usage in the JSX:
// <motion.div
//   key={entity.id}
//   data-entity-wrapper
//   initial={{
//     opacity: 0, scale: 0.98, y: 8,
//     left: entity.position.x,
//     top: entity.position.y,
//   }}
//   animate={{
//     opacity: 1, scale: 1, y: 0,
//     left: entity.position.x,
//     top: entity.position.y,
//   }}
//   exit={{ opacity: 0, scale: 0.98, y: 8 }}
//   transition={ENTITY_TRANSITION}
//   style={{
//     position: 'absolute',
//     zIndex: entity.z_index,
//   }}
// >

export { ENTITY_TRANSITION }
