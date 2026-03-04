// GET /api/entity-types — returns the built-in type catalog for agent discovery.
// No auth required: this is static metadata, not user data.
import { NextResponse } from 'next/server'
import { getAllAppTypes } from '@/apps/_registry'
import { getAllowedPresentations } from '@/lib/presentationRules'

export async function GET() {
	const types = getAllAppTypes().map((app) => ({
		type: app.type,
		name: app.name,
		description: app.description,
		defaultPresentation: app.defaultPresentation,
		defaultSize: app.defaultSize,
		initialState: app.initialState ?? {},
		maxInstances: app.maxInstances ?? null,
		allowedPresentations: getAllowedPresentations(app.type),
	}))

	return NextResponse.json(types)
}
