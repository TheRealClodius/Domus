import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
import '@/tokens/tokens.css'

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
	display: 'swap',
})

const kalice = localFont({
	src: [
		{ path: '../public/fonts/Kalice-Trial-Regular.otf', weight: '400', style: 'normal' },
		{ path: '../public/fonts/Kalice-Trial-Medium.otf', weight: '500', style: 'normal' },
		{ path: '../public/fonts/Kalice-Trial-Bold.otf', weight: '700', style: 'normal' },
	],
	variable: '--font-kalice',
	display: 'swap',
})

export const metadata: Metadata = {
	title: 'Domus',
	description: 'Your spatial workspace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			data-theme="light"
			className={`${inter.variable} ${kalice.variable}`}
			suppressHydrationWarning
		>
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
