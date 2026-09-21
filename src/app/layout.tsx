import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/contexts/theme-context'
import { AuthProvider } from '@/contexts/auth-context'
import { QueryProvider } from '@/contexts/query-provider'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { ToastProvider } from '@/components/ui/toast'
import { OfflineManager } from '@/components/shared/offline-manager'
import { AuthSyncManager } from '@/components/shared/auth-sync-manager'
import { SessionExpiryHandler } from '@/components/shared/session-expiry-handler'
import { BookmarkHandler } from '@/components/shared/bookmark-handler'
import { PerformanceMonitorProvider } from '@/components/shared/performance-monitor-provider'
import { PwaRegistration } from '@/components/shared/pwa-registration'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  applicationName: 'Forma',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Forma', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  title: "Forma | Сімейні фінанси",
  description: "Доходи, витрати, рахунки та борги вашої сім’ї в одному місці.",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c1917',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body 
        className={`${inter.className} antialiased`}
        suppressHydrationWarning={true}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <QueryProvider>
              <ToastProvider>
                <AuthProvider>
                  <PerformanceMonitorProvider>
                    <Suspense fallback={
                      <div className="min-h-screen flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted/30 border-t-accent drop-shadow-sm" />
                      </div>
                    }>
                      <BookmarkHandler>
                        <OfflineManager />
                        <AuthSyncManager />
                        <SessionExpiryHandler />
                        {children}
                      </BookmarkHandler>
                    </Suspense>
                  </PerformanceMonitorProvider>
                </AuthProvider>
              </ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
        <PwaRegistration />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}