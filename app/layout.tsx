import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Public_Sans, Geist_Mono } from 'next/font/google'
import './globals.css'

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LegalLock — Secure Document Management',
  description:
    'Official law enforcement platform for secure custody, retrieval, and audit of case documents.',
  generator: 'LegalLock',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1f2a44',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`light bg-background ${publicSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
