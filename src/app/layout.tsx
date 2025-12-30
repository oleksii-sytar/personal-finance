import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Forma - Family Finance Management',
  description: 'Structure and discipline for your family\'s money management. Replace spreadsheets with a premium, unified experience designed for families with children.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body 
        className={`${inter.className} antialiased bg-[#1C1917] text-white`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}