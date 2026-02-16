import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/tokens/tokens.css'

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap',
})

// TODO: Add Kalice-Trial as local font when font files are available
// import localFont from 'next/font/local'
// const kalice = localFont({
//   src: '../public/fonts/KaliceTrial-Regular.woff2',
//   variable: '--font-kalice',
//   display: 'swap',
// })

export const metadata: Metadata = {
	title: 'Domus',
	description: 'Your spatial workspace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" data-theme="light" className={inter.variable} suppressHydrationWarning>
			<head>
				<script
					suppressHydrationWarning
					// biome-ignore lint/security/noDangerouslySetInnerHtml: theme detection must run before paint
					dangerouslySetInnerHTML={{
						__html: `(function(){var t=localStorage.getItem('domus-theme')||'light';document.documentElement.setAttribute('data-theme',t)})()`,
					}}
				/>
			</head>
			<body className="font-sans text-body leading-normal antialiased">{children}</body>
		</html>
	)
}
