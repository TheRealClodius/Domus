import { describe, expect, it, vi } from 'vitest'

const mockUpload = vi.fn()
const mockCreateSignedUrl = vi.fn()

const mockStorage = {
	from: vi.fn().mockReturnValue({
		upload: mockUpload,
		createSignedUrl: mockCreateSignedUrl,
	}),
}

const mockSupabase = {
	storage: mockStorage,
}

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => mockSupabase,
}))

const { uploadMedia, MAX_FILE_SIZE } = await import('@/apps/chat/useMediaUpload')

describe('uploadMedia', () => {
	it('returns signed URL after upload', async () => {
		const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
		mockUpload.mockResolvedValue({ data: { path: 'u1/chat/g1/m1/test.txt' }, error: null })
		mockCreateSignedUrl.mockResolvedValue({
			data: { signedUrl: 'https://storage.example.com/signed/u1/chat/g1/m1/test.txt' },
		})

		const result = await uploadMedia(file, 'g1', 'm1', 'u1')
		expect(result).toEqual({
			url: 'https://storage.example.com/signed/u1/chat/g1/m1/test.txt',
			type: 'text/plain',
		})
		expect(mockStorage.from).toHaveBeenCalledWith('chat-media')
		expect(mockCreateSignedUrl).toHaveBeenCalledWith('u1/chat/g1/m1/test.txt', 3600)
	})

	it('prefixes upload path with userId', async () => {
		const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
		mockUpload.mockResolvedValue({ data: { path: 'u1/chat/g1/m1/photo.jpg' }, error: null })
		mockCreateSignedUrl.mockResolvedValue({
			data: { signedUrl: 'https://storage.example.com/signed/u1/chat/g1/m1/photo.jpg' },
		})

		await uploadMedia(file, 'g1', 'm1', 'u1')
		expect(mockUpload).toHaveBeenCalledWith('u1/chat/g1/m1/photo.jpg', file, {
			contentType: 'image/jpeg',
		})
	})

	it('rejects files over MAX_FILE_SIZE', async () => {
		// Create a file larger than 10MB
		const bigContent = new Uint8Array(MAX_FILE_SIZE + 1)
		const file = new File([bigContent], 'big.bin', { type: 'application/octet-stream' })

		await expect(uploadMedia(file, 'g1', 'm1', 'u1')).rejects.toThrow(/10MB/i)
	})

	it('throws on upload error', async () => {
		const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
		mockUpload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } })

		await expect(uploadMedia(file, 'g1', 'm1', 'u1')).rejects.toThrow('Bucket not found')
	})

	it('exports MAX_FILE_SIZE as 10MB', () => {
		expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
	})
})
