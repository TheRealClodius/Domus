import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': resolve(__dirname, '.'),
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
		exclude: [
			'node_modules',
			'.next',
			'dist',
			'.worktrees',
			'**/node_modules/**',
			'**/.worktrees/**',
		],
		passWithNoTests: true,
	},
})
