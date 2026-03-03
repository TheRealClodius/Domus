import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '@/core/profile/useProfile'

const mockUpdateName = vi.fn()
const mockUpdateCustomInstruction = vi.fn()
const mockUpdateAvatar = vi.fn()
const mockFetchUsage = vi.fn()

const defaultProfile: UserProfile = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	avatarUrl: 'https://example.com/avatar.jpg',
	customInstruction: 'I like concise answers.',
	plan: 'citizen',
	planPeriodStart: '2026-02-01',
	planPeriodEnd: '2026-03-01',
}

let mockProfileReturn = {
	profile: defaultProfile as UserProfile | null,
	isLoading: false,
	updateName: mockUpdateName,
	updateCustomInstruction: mockUpdateCustomInstruction,
	updateAvatar: mockUpdateAvatar,
}

let mockUsageStoreState = {
	fetchUsage: mockFetchUsage,
	usageStats: null as null | {
		agent_turn: { used: number; limit: number }
		image_generation: { used: number; limit: number }
		web_search: { used: number; limit: number }
		resets_at: string
		plan: string | null
	},
	_usageFetched: false,
}

vi.mock('@/core/profile/useProfile', () => ({
	useProfile: () => mockProfileReturn,
	useProfileStore: (selector: (s: typeof mockUsageStoreState) => unknown) =>
		selector(mockUsageStoreState),
}))

vi.mock('@/apps/calendar/useGoogleCalendarConnection', () => ({
	useGoogleCalendarConnection: () => ({
		isConnected: true,
		isLoading: false,
		connect: vi.fn(),
		disconnect: vi.fn(),
	}),
}))

vi.mock('@/core/profile/useGoogleDriveConnection', () => ({
	useGoogleDriveConnection: () => ({
		isConnected: false,
		isLoading: false,
		connect: vi.fn(),
		disconnect: vi.fn(),
	}),
}))

import ProfilePanel from '@/core/profile/ProfilePanel'

describe('ProfilePanel', () => {
	beforeEach(() => {
		mockProfileReturn = {
			profile: defaultProfile,
			isLoading: false,
			updateName: mockUpdateName,
			updateCustomInstruction: mockUpdateCustomInstruction,
			updateAvatar: mockUpdateAvatar,
		}
	})

	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('shows loading state', () => {
		mockProfileReturn = { ...mockProfileReturn, profile: null, isLoading: true }
		render(<ProfilePanel sectionId="general" />)
		expect(screen.getByText('Loading profile…')).toBeDefined()
	})

	it('shows error state when profile is null', () => {
		mockProfileReturn = { ...mockProfileReturn, profile: null, isLoading: false }
		render(<ProfilePanel sectionId="general" />)
		expect(screen.getByText('Unable to load profile.')).toBeDefined()
	})

	describe('general section', () => {
		it('renders profile header with name and email', () => {
			render(<ProfilePanel sectionId="general" />)
			expect(screen.getByText('Jane Doe')).toBeDefined()
			expect(screen.getByText('jane@example.com')).toBeDefined()
		})

		it('renders avatar image when avatarUrl exists', () => {
			render(<ProfilePanel sectionId="general" />)
			const img = screen.getByTestId('avatar-upload').querySelector('img')
			expect(img).toBeDefined()
			expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg')
		})

		it('renders initials when no avatarUrl', () => {
			mockProfileReturn = {
				...mockProfileReturn,
				profile: { ...defaultProfile, avatarUrl: null },
			}
			render(<ProfilePanel sectionId="general" />)
			expect(screen.getByTestId('avatar-upload').textContent).toContain('JD')
		})

		it('renders name input with current value', () => {
			render(<ProfilePanel sectionId="general" />)
			const input = screen.getByLabelText('Name') as HTMLInputElement
			expect(input.value).toBe('Jane Doe')
		})

		it('calls updateName on blur when name changed', () => {
			render(<ProfilePanel sectionId="general" />)
			const input = screen.getByLabelText('Name')
			fireEvent.change(input, { target: { value: 'Jane Smith' } })
			fireEvent.blur(input)
			expect(mockUpdateName).toHaveBeenCalledWith('Jane Smith')
		})

		it('does not call updateName on blur when name unchanged', () => {
			render(<ProfilePanel sectionId="general" />)
			const input = screen.getByLabelText('Name')
			fireEvent.focus(input)
			fireEvent.blur(input)
			expect(mockUpdateName).not.toHaveBeenCalled()
		})

		it('renders custom instruction textarea with current value', () => {
			render(<ProfilePanel sectionId="general" />)
			const textarea = screen.getByLabelText('About you') as HTMLTextAreaElement
			expect(textarea.value).toBe('I like concise answers.')
		})

		it('calls updateCustomInstruction on blur when changed', () => {
			render(<ProfilePanel sectionId="general" />)
			const textarea = screen.getByLabelText('About you')
			fireEvent.change(textarea, { target: { value: 'New instruction' } })
			fireEvent.blur(textarea)
			expect(mockUpdateCustomInstruction).toHaveBeenCalledWith('New instruction')
		})

		it('does not render connections content', () => {
			render(<ProfilePanel sectionId="general" />)
			expect(screen.queryByTestId('connection-google-calendar')).toBeNull()
		})
	})

	describe('connections section', () => {
		it('renders Calendar and Drive rows', () => {
			render(<ProfilePanel sectionId="connections" />)
			expect(screen.getByTestId('connection-google-calendar')).toBeDefined()
			expect(screen.getByTestId('connection-google-drive')).toBeDefined()
		})

		it('does not render general content', () => {
			render(<ProfilePanel sectionId="connections" />)
			expect(screen.queryByLabelText('Name')).toBeNull()
		})
	})

	describe('billing section', () => {
		it('renders plan name', () => {
			render(<ProfilePanel sectionId="billing" />)
			expect(screen.getByText('Domus Citizen')).toBeDefined()
		})

		it('renders billing period dates', () => {
			render(<ProfilePanel sectionId="billing" />)
			expect(screen.getByText(/Feb 1, 2026/)).toBeDefined()
		})

		it('does not render general content', () => {
			render(<ProfilePanel sectionId="billing" />)
			expect(screen.queryByLabelText('Name')).toBeNull()
		})
	})

	describe('usage section', () => {
		it('shows free-plan CTA when plan is null', () => {
			mockUsageStoreState = {
				...mockUsageStoreState,
				_usageFetched: true,
				usageStats: null,
			}
			render(<ProfilePanel sectionId="usage" />)
			expect(screen.getByText(/You're on the free plan/)).toBeDefined()
		})

		it('shows usage bars for paid plan', () => {
			mockUsageStoreState = {
				...mockUsageStoreState,
				_usageFetched: true,
				usageStats: {
					agent_turn: { used: 42, limit: 200 },
					image_generation: { used: 5, limit: 20 },
					web_search: { used: 10, limit: 50 },
					resets_at: '2026-04-01T00:00:00.000Z',
					plan: 'citizen',
				},
			}
			render(<ProfilePanel sectionId="usage" />)
			expect(screen.getByText('Messages')).toBeDefined()
			expect(screen.getByText('42 / 200')).toBeDefined()
			expect(screen.getByText(/Resets/)).toBeDefined()
		})

		it('does not render general content', () => {
			render(<ProfilePanel sectionId="usage" />)
			expect(screen.queryByLabelText('Name')).toBeNull()
		})
	})
})
