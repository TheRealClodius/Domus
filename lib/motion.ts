// Motion configuration — spring physics and duration tiers.
// See docs/DESIGN-DIRECTION.md P6: Agent animates, user is immediate.

/** Spring config: crisp settle, minimal overshoot */
export const SPRING = {
	/** Default spring for agent-origin animations */
	agent: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 0.5 },
	/** Snappy spring for UI transitions */
	snappy: { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.5 },
	/** Pop-in for entity creation — bouncy but settles fast */
	popIn: { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.5 },
	/** Gentle spring for expand/collapse transitions */
	gentle: { type: 'spring' as const, stiffness: 200, damping: 20, mass: 0.5 },
	/** Page-level spring — snappy, controlled slide with minimal bounce. Full-screen sheet, page transitions. */
	page: { type: 'spring' as const, stiffness: 120, damping: 20, mass: 0.5 },
	/** Cinematic spring for spatial parting — slow, smooth settle */
	part: { type: 'spring' as const, stiffness: 120, damping: 22, mass: 0.5 },
	/** Folder gather/scatter — snappy card-deck feel */
	folder: { type: 'spring' as const, stiffness: 400, damping: 32, mass: 0.5 },
	/** Prompt input IDLE↔CLICKED — underdamped (~0.577 ratio), ~1 oscillation */
	prompt: { type: 'spring' as const, stiffness: 300, damping: 20 },
	/** Progress bar fill — ~600ms settle, critically damped (no bounce) */
	bar: { type: 'spring' as const, duration: 0.6, bounce: 0 },
} as const

/** Duration tiers in seconds (for motion/react) */
export const DURATION = {
	fast: 0.15, // micro-interactions: hover, press
	hover: 0.2, // hover state transitions, fast tween resolves
	medium: 0.3, // component transitions: modal slides, content swaps
	slow: 0.5, // entity creation/archival: spawn/despawn
} as const

/** Framer-motion easing tuples — [x1, y1, x2, y2] cubic-bezier control points */
export const MOTION_EASE = {
	/** Primary ease-out — size & color transitions */
	out: [0, 0, 0.58, 1] as const,
	/** Material standard — smooth deceleration */
	smooth: [0.4, 0, 0.2, 1] as const,
	/** Quick ease-out — snappy feedback */
	snappy: [0.4, 0, 1, 1] as const,
} as const

/** Agent glow timing */
export const AGENT_GLOW = {
	/** How long the glow stays full before starting to fade */
	holdMs: 500,
	/** Fade-out duration */
	fadeDuration: 2.5, // seconds — deliberately slow, ambient indicator
} as const

/** Resize handle animation timing per visual state */
export const HANDLE_TIMING = {
	idle: {
		opacity: 'opacity 0.2s ease-out',
		transform: 'transform 0.35s ease-out',
		inset: 'top 0.35s ease-out, bottom 0.35s ease-out, left 0.35s ease-out, right 0.35s ease-out',
	},
	hover: {
		opacity: 'opacity 0.2s ease-in',
		transform: 'transform 0.35s ease-out',
		inset: 'top 0.35s ease-out, bottom 0.35s ease-out, left 0.35s ease-out, right 0.35s ease-out',
	},
	active: {
		opacity: 'opacity 0.1s ease-out',
		transform: 'transform 0.15s ease-out',
		inset: 'top 0.15s ease-out, bottom 0.15s ease-out, left 0.15s ease-out, right 0.15s ease-out',
	},
} as const
