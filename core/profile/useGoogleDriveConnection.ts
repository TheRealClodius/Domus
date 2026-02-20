'use client'

export interface GoogleDriveConnection {
	isConnected: boolean
	isLoading: boolean
	connect: () => Promise<void>
	disconnect: () => Promise<void>
}

/** Placeholder — Drive OAuth routes not wired yet. */
export function useGoogleDriveConnection(): GoogleDriveConnection {
	return {
		isConnected: false,
		isLoading: false,
		// TODO: wire up /api/google-drive/* routes when Drive integration ships
		connect: async () => {},
		disconnect: async () => {},
	}
}
