'use client'

import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
import { UserProfile } from '@/components/layout/user-profile'
import { MobileNavigation } from '@/components/layout/mobile-navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DesktopSidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:flex lg:flex-col bg-secondary border-r border-primary">
      <div className="flex h-20 items-center px-8 border-b border-primary">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-lg flex items-center justify-center">
            <span className="text-inverse font-bold text-sm font-space-grotesk">F</span>
          </div>
          <span className="text-primary font-space-grotesk font-semibold text-lg">Forma</span>
        </Link>
      </div>

      <nav className="mt-4 px-6 flex-1">
        <div className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
              )}
            >
              <item.icon className="mr-3 h-5 w-5 text-[var(--accent-primary)]" />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-6 border-t border-primary">
        <UserProfile />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SmartRouteGuard requireAuth={true}>
      <div className="min-h-screen bg-[var(--bg-primary)] relative">
        <MobileNavigation />
        <DesktopSidebar />

        <div className="lg:pl-72">
          <div className="lg:hidden">
            <div className="flex items-center justify-between h-16 px-4 bg-secondary border-b border-primary">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-lg flex items-center justify-center">
                  <span className="text-inverse font-bold text-sm font-space-grotesk">F</span>
                </div>
                <span className="text-primary font-space-grotesk font-semibold text-lg">Forma</span>
              </Link>
              <div className="w-12 h-12" />
            </div>
          </div>

          <main className="py-4 lg:py-8">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SmartRouteGuard>
  )
}
