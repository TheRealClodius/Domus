'use client'

import { ImageIcon } from 'lucide-react'
import type { AppProps, BuiltInApp } from '@/apps/_types'

function ImageCard({ state }: AppProps) {
	const imageUrl = (state?.image_url ?? state?.src) as string | undefined
	const prompt = state?.generation_prompt as string | undefined
	const error = state?.generation_error as string | undefined

	if (error && !imageUrl) {
		return (
			<div className="flex items-center justify-center h-full text-on-surface-muted">
				<p>Image generation failed: {error}</p>
			</div>
		)
	}

	if (!imageUrl) {
		return (
			<div className="flex items-center justify-center h-full text-on-surface-muted">
				<p className="text-sm italic">Generating image...</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col items-center gap-3 p-4">
			<img
				src={imageUrl}
				alt={prompt || 'Generated image'}
				className="max-w-full rounded-lg"
				data-testid="image-renderer"
			/>
			{prompt && <p className="text-body-sm text-on-surface-muted italic">"{prompt}"</p>}
		</div>
	)
}

export const imageApp: BuiltInApp = {
	source: 'built-in',
	type: 'image',
	name: 'Image',
	description:
		'AI-generated image. State fields: image_url (string), generation_prompt (string), created_via (string, e.g. "gemini"), generation_error (string, on failure). Generate images via the Python agent image tools; the frontend renders whatever image_url is set in state.',
	icon: ImageIcon,
	component: ImageCard,
	defaultPresentation: 'card',
	defaultSize: { width: 232, height: 300 },
	reduce: (state) => state,
	summarize: (state) => (state.generation_prompt as string) ?? '',
	summarizeOn: [],
}
