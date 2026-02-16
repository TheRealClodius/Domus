import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PromptInputChip from '@/core/chat/PromptInputChip'
import type { ContextItem } from '@/core/chat/usePromptInputState'

function makeItem(overrides: Partial<ContextItem> = {}): ContextItem {
	return {
		id: 'chip-1',
		file: new File([''], 'photo.png', { type: 'image/png' }),
		name: 'photo.png',
		type: 'image',
		status: 'ready',
		...overrides,
	}
}

describe('PromptInputChip', () => {
	afterEach(() => cleanup())

	it('renders image preview for image type items', () => {
		const item = makeItem({ preview: 'data:image/png;base64,abc' })
		render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		const img = screen.getByAltText('photo.png')
		expect(img).toBeDefined()
		expect(img.tagName).toBe('IMG')
	})

	it('renders extension badge for document type items', () => {
		const item = makeItem({
			type: 'document',
			name: 'report.pdf',
			file: new File([''], 'report.pdf', { type: 'application/pdf' }),
		})
		render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		expect(screen.getByText('PDF')).toBeDefined()
	})

	it('shows loading state when status is loading', () => {
		const item = makeItem({ status: 'loading' })
		render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		expect(screen.getByTestId('chip-loading')).toBeDefined()
	})

	it('shows error state when status is error', () => {
		const item = makeItem({ status: 'error', error: 'File too large' })
		render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		expect(screen.getByTestId('chip-error')).toBeDefined()
	})

	it('calls onRemove with correct id when remove button clicked', () => {
		const onRemove = vi.fn()
		const item = makeItem({ id: 'remove-me' })
		render(<PromptInputChip item={item} onRemove={onRemove} />)

		const removeBtn = screen.getByRole('button', { name: /remove/i })
		fireEvent.click(removeBtn)

		expect(onRemove).toHaveBeenCalledWith('remove-me')
	})

	it('renders with correct dimensions (56x45)', () => {
		const item = makeItem()
		const { container } = render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		const chip = container.firstElementChild as HTMLElement
		expect(chip.style.width).toBe('56px')
		expect(chip.style.height).toBe('45px')
	})

	it('truncates extension to max 4 characters', () => {
		const item = makeItem({
			type: 'document',
			name: 'file.docx',
			file: new File([''], 'file.docx', {
				type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			}),
		})
		render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		expect(screen.getByText('DOCX')).toBeDefined()
	})

	it('error state renders AlertTriangle icon', () => {
		const item = makeItem({ status: 'error', error: 'File too large' })
		const { container } = render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		const svg = container.querySelector('svg.lucide-triangle-alert')
		expect(svg).not.toBeNull()
	})

	it('extension chip has blue background', () => {
		const item = makeItem({
			type: 'document',
			name: 'report.pdf',
			file: new File([''], 'report.pdf', { type: 'application/pdf' }),
		})
		const { container } = render(<PromptInputChip item={item} onRemove={vi.fn()} />)

		const extDiv = screen.getByText('PDF').closest('div')
		expect(extDiv?.style.background).toBe('rgb(113, 205, 255)')
	})
})
