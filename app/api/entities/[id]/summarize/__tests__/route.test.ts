import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/supabase/service', () => ({
	getSupabaseServiceClient: vi.fn(),
}))

vi.mock('@google/genai', () => ({
	GoogleGenAI: vi.fn(),
}))

import { GoogleGenAI } from '@google/genai'
import { getSupabaseServerClient } from '@/core/supabase/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { POST } from '../route'

function createQueryMock(result: { data: unknown; error: unknown }) {
	const handler = (): unknown =>
		new Proxy(
			{},
			{
				get(_target, prop) {
					if (prop === 'then') {
						return (resolve: (v: unknown) => void) => resolve(result)
					}
					return handler
				},
			},
		)
	return handler
}

function makeUserRequest(entityId: string, body: object) {
	return new Request(`http://localhost/api/entities/${entityId}/summarize`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
}

function makeServiceRequest(entityId: string, body: object, spaceId = 'space-1') {
	return new Request(`http://localhost/api/entities/${entityId}/summarize?space_id=${spaceId}`, {
		method: 'POST',
		headers: {
			authorization: 'Bearer test-service-token',
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	})
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) }
}

const calendarEntity = { id: 'ent-1', space_id: 'space-1' }
const calendarBody = {
	type: 'calendar',
	state: { view: 'month', selected_date: '2026-01-01' },
}

describe('POST /api/entities/[id]/summarize', () => {
	const originalEnv = { ...process.env }

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
		process.env.GOOGLE_API_KEY = 'test-api-key'
		process.env.GEMINI_SUMMARY_MODEL = 'gemini-2.0-flash-lite'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv.DOMUS_SERVICE_TOKEN
		process.env.GOOGLE_API_KEY = originalEnv.GOOGLE_API_KEY
		process.env.GEMINI_SUMMARY_MODEL = originalEnv.GEMINI_SUMMARY_MODEL
	})

	it('calls Gemini and writes the summary to Supabase', async () => {
		const updateMock = vi
			.fn()
			.mockImplementation(() => createQueryMock({ data: null, error: null })())
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
				update: updateMock,
			})),
		})
		const generateContent = vi
			.fn()
			.mockResolvedValue({ text: 'Calendar showing January 2026 in month view.' })
		;(GoogleGenAI as Mock).mockImplementation(function () {
			return { models: { generateContent } }
		})

		const req = makeServiceRequest('ent-1', calendarBody)
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.summary).toBe('Calendar showing January 2026 in month view.')
		expect(updateMock).toHaveBeenCalledWith(
			expect.objectContaining({ summary: 'Calendar showing January 2026 in month view.' }),
		)
	})

	it('returns summary: null and does NOT write when Gemini returns empty string', async () => {
		const updateMock = vi.fn()
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
				update: updateMock,
			})),
		})
		const generateContent = vi.fn().mockResolvedValue({ text: '' })
		;(GoogleGenAI as Mock).mockImplementation(function () {
			return { models: { generateContent } }
		})

		const req = makeServiceRequest('ent-1', calendarBody)
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(json.summary).toBeNull()
		expect(json.error).toBe('empty_response')
		expect(updateMock).not.toHaveBeenCalled()
	})

	it('returns summary: null and does NOT write when Gemini throws', async () => {
		const updateMock = vi.fn()
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
				update: updateMock,
			})),
		})
		const generateContent = vi.fn().mockRejectedValue(new Error('API error'))
		;(GoogleGenAI as Mock).mockImplementation(function () {
			return { models: { generateContent } }
		})

		const req = makeServiceRequest('ent-1', calendarBody)
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(json.summary).toBeNull()
		expect(json.error).toBe('gemini_error')
		expect(updateMock).not.toHaveBeenCalled()
	})

	it('returns 401 when no auth provided', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = makeUserRequest('ent-1', calendarBody)
		const res = await POST(req as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})

	it('returns 404 when entity not found', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: null, error: null })(),
			})),
		})

		const req = makeServiceRequest('nonexistent', calendarBody)
		const res = await POST(req as never, makeParams('nonexistent'))
		expect(res.status).toBe(404)
	})

	it('returns 400 when type or state missing', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
			})),
		})

		const req = makeServiceRequest('ent-1', { type: 'calendar' }) // missing state
		const res = await POST(req as never, makeParams('ent-1'))
		expect(res.status).toBe(400)
	})

	it('returns error when GOOGLE_API_KEY is not set', async () => {
		delete process.env.GOOGLE_API_KEY
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
			})),
		})

		const req = makeServiceRequest('ent-1', calendarBody)
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(json.summary).toBeNull()
		expect(json.error).toContain('GOOGLE_API_KEY')
	})
})
