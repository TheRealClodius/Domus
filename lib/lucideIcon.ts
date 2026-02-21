import { icons } from 'lucide-react'

/**
 * Look up a Lucide icon component by kebab-case name.
 * Returns undefined if not found.
 *
 * @example
 * getLucideIcon('calculator')  // → icons.Calculator
 * getLucideIcon('arrow-left')  // → icons.ArrowLeft
 */
export function getLucideIcon(name: string) {
	// Convert kebab-case to PascalCase: "arrow-left" → "ArrowLeft"
	const pascal = name
		.split('-')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join('')

	return (icons as Record<string, (typeof icons)[keyof typeof icons]>)[pascal]
}
