import { describe, expect, it } from 'vitest'
import { AgentCursor } from '@/core/editor/extensions/AgentCursor'

describe('AgentCursor', () => {
	it('exports a Tiptap extension', () => {
		expect(AgentCursor).toBeDefined()
		expect(AgentCursor.name).toBe('agentCursor')
	})
})
