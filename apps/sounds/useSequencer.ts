'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { loadSamples } from '@/apps/sounds/samples'
import { type SoundsState, VOICES, type VoiceName } from '@/apps/sounds/types'
import { useEntityStore } from '@/core/entityStore'

export function stepIntervalSec(bpm: number): number {
	return 60 / bpm / 4
}

export function swingOffset(step: number, swing: number, bpm: number): number {
	if (step % 2 === 0) return 0
	const halfStep = stepIntervalSec(bpm) / 2
	return (swing / 100) * halfStep
}

export function useSequencer(entityId: string): {
	currentStep: number
	audioReady: boolean
	initAudio: () => void
} {
	const [currentStep, setCurrentStep] = useState(-1)
	const [audioReady, setAudioReady] = useState(false)

	const ctxRef = useRef<AudioContext | null>(null)
	const samplesRef = useRef<Record<VoiceName, AudioBuffer> | null>(null)
	const gainNodesRef = useRef<Record<VoiceName, GainNode> | null>(null)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const nextStepTimeRef = useRef(0)
	const currentStepRef = useRef(0)

	const initAudio = useCallback(async () => {
		if (ctxRef.current) {
			// Resume suspended context on repeated user gestures
			if (ctxRef.current.state === 'suspended') {
				ctxRef.current.resume()
			}
			return
		}
		const ctx = new AudioContext()
		ctxRef.current = ctx

		const samples = await loadSamples(ctx)
		samplesRef.current = samples

		const gains = {} as Record<VoiceName, GainNode>
		for (const voice of VOICES) {
			const gain = ctx.createGain()
			gain.connect(ctx.destination)
			gains[voice] = gain
		}
		gainNodesRef.current = gains
		setAudioReady(true)
	}, [])

	useEffect(() => {
		const schedule = () => {
			const ctx = ctxRef.current
			const samples = samplesRef.current
			const gains = gainNodesRef.current
			if (!ctx || !samples || !gains) return

			const state = useEntityStore.getState().entities[entityId]?.state as SoundsState | undefined
			if (!state?.playing) return

			const stepDur = stepIntervalSec(state.bpm)
			const lookahead = 0.1 // 100ms

			while (nextStepTimeRef.current < ctx.currentTime + lookahead) {
				const step = currentStepRef.current
				const offset = swingOffset(step, state.swing, state.bpm)
				const time = nextStepTimeRef.current + offset

				for (const voice of VOICES) {
					const vs = state.voices[voice]
					// Update gain for volume/mute
					gains[voice].gain.setValueAtTime(vs.muted ? 0 : vs.volume / 100, time)

					if (vs.pattern[step]) {
						const source = ctx.createBufferSource()
						source.buffer = samples[voice]
						source.connect(gains[voice])
						source.start(time)
					}
				}

				// Schedule visual update
				const capturedStep = step
				requestAnimationFrame(() => setCurrentStep(capturedStep))

				currentStepRef.current = (step + 1) % 16
				nextStepTimeRef.current += stepDur
			}
		}

		intervalRef.current = setInterval(schedule, 25)
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
		}
	}, [entityId])

	// Reset timing when play starts
	useEffect(() => {
		const unsubscribe = useEntityStore.subscribe((curr, prev) => {
			const currState = curr.entities[entityId]?.state as SoundsState | undefined
			const prevState = prev.entities[entityId]?.state as SoundsState | undefined
			if (currState?.playing && !prevState?.playing) {
				// Reset to beginning
				currentStepRef.current = 0
				if (ctxRef.current) {
					nextStepTimeRef.current = ctxRef.current.currentTime
				}
			}
			if (!currState?.playing && prevState?.playing) {
				setCurrentStep(-1)
			}
		})
		return unsubscribe
	}, [entityId])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current)
			ctxRef.current?.close()
		}
	}, [])

	return { currentStep, audioReady, initAudio }
}
