import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getSupabaseServiceClient } from '@/core/supabase/service'

const MODEL = process.env.GEMINI_SUMMARY_MODEL ?? 'gemini-3.1-flash-lite-preview'

const PROMPT_TEMPLATE = (
	type: string,
	state: Record<string, unknown>,
	content?: string,
) => `Summarize this entity for a personal workspace assistant. One sentence, max 120 characters.
Describe what it IS and CONTAINS — not transient state (playing/stopped, current view, open/closed).

Type: ${type}
State: ${JSON.stringify(state)}
${content ? `Content: ${content.slice(0, 500)}` : ''}

Summary:`

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const auth = await resolveAuth(request)
	if (auth.type === 'error') {
		return NextResponse.json({ error: auth.message }, { status: auth.status })
	}

	let body: { type?: string; state?: Record<string, unknown>; content?: string }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const { type, state, content } = body
	if (!type || !state) {
		return NextResponse.json({ error: 'Missing type or state' }, { status: 400 })
	}

	// Verify entity exists and user has access
	const readClient = auth.type === 'service' ? getSupabaseServiceClient() : auth.supabase
	const spaceId = auth.type === 'service' ? auth.space_id : undefined

	let query = readClient.from('entities').select('id, space_id').eq('id', id)
	if (spaceId) query = query.eq('space_id', spaceId)
	const { data: entity, error: readError } = await query.maybeSingle()

	if (readError || !entity) {
		return NextResponse.json({ error: 'not_found' }, { status: 404 })
	}

	if (auth.type === 'user') {
		const { data: space } = await auth.supabase
			.from('spaces')
			.select('id')
			.eq('id', entity.space_id)
			.maybeSingle()
		if (!space) {
			return NextResponse.json({ error: 'forbidden' }, { status: 403 })
		}
	}

	const apiKey = process.env.GOOGLE_API_KEY
	if (!apiKey) {
		console.error('[summarize] GOOGLE_API_KEY not set')
		return NextResponse.json({ summary: null, error: 'GOOGLE_API_KEY not configured' })
	}

	let summary: string
	try {
		const ai = new GoogleGenAI({ apiKey })
		const response = await ai.models.generateContent({
			model: MODEL,
			contents: PROMPT_TEMPLATE(type, state, content),
		})
		const text = response.text?.trim() ?? ''
		if (!text) {
			console.warn('[summarize] Gemini returned empty response for entity', id)
			return NextResponse.json({ summary: null, error: 'empty_response' })
		}
		summary = text.slice(0, 200)
	} catch (err) {
		console.error('[summarize] Gemini error for entity', id, err)
		return NextResponse.json({ summary: null, error: 'gemini_error' })
	}

	const serviceClient = getSupabaseServiceClient()
	const { error: writeError } = await serviceClient
		.from('entities')
		.update({ summary })
		.eq('id', id)

	if (writeError) {
		console.error('[summarize] Failed to write summary for entity', id, writeError)
		return NextResponse.json({ summary: null, error: 'write_failed' })
	}

	return NextResponse.json({ summary })
}
