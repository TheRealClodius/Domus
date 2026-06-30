import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}))

function createQueryMock(result: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {}
	const handler = () =>
		new Proxy(chain, {
			get(_target, prop) {
				if (prop === 'then') {
					return (resolve: (v: unknown) => void) => resolve(result)
				}
				return handler
			},
		})
	return handler
}

const mockUpdate = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		from: mockFrom,
	}),
}))

import SpaceSwitcher from '@/core/canvas/SpaceSwitcher'

describe('SpaceSwitcher', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('renders the user spaces when open', async () => {
		mockFrom.mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({
					data: [
						{ id: 'space-1', name: 'Work' },
						{ id: 'space-2', name: 'Personal' },
					],
					error: null,
				})()
			}
			return createQueryMock({ data: null, error: null })()
		})

		render(
			<SpaceSwitcher
				open
				onOpenChange={vi.fn()}
				currentSpaceId="space-1"
				userId="user-123"
			/>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('space-option-space-1')).toBeDefined()
			expect(screen.getByTestId('space-option-space-2')).toBeDefined()
		})
		expect(screen.getByText('Work')).toBeDefined()
		expect(screen.getByText('Personal')).toBeDefined()
	})

	it('updates active_space_id and navigates on selection', async () => {
		mockFrom.mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({
					data: [
						{ id: 'space-1', name: 'Work' },
						{ id: 'space-2', name: 'Personal' },
					],
					error: null,
				})()
			}
			if (table === 'users') {
				return {
					update: (payload: unknown) => {
						mockUpdate(payload)
						return {
							eq: (column: string, value: string) => {
								expect(column).toBe('id')
								expect(value).toBe('user-123')
								return createQueryMock({ data: null, error: null })()
							},
						}
					},
				}
			}
			return createQueryMock({ data: null, error: null })()
		})

		const onOpenChange = vi.fn()
		render(
			<SpaceSwitcher
				open
				onOpenChange={onOpenChange}
				currentSpaceId="space-1"
				userId="user-123"
			/>,
		)

		await waitFor(() => {
			expect(screen.getByTestId('space-option-space-2')).toBeDefined()
		})

		fireEvent.click(screen.getByTestId('space-option-space-2'))

		await waitFor(() => {
			expect(mockUpdate).toHaveBeenCalledWith({ active_space_id: 'space-2' })
			expect(mockPush).toHaveBeenCalledWith('/space/space-2')
			expect(onOpenChange).toHaveBeenCalledWith(false)
		})
	})
})
