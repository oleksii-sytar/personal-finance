'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  FolderOpen, 
  BarChart3, 
  Settings,
  Wallet
} from 'lucide-react'
import { SmartRouteGuard } from '@/components/shared/smart-route-guard'
import { WorkspaceSelector } from '@/components/shared/workspace-selector'
import { WorkspaceCreationModal } from '@/components/shared/workspace-creation-modal'
import { UserProfile } from '@/components/layout/user-profile'
import { MobileNavigation } from '@/components/layout/mobile-navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowUpDown },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Categories', href: '/categories', icon: FolderOpen },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <div 
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-72 lg:flex lg:flex-col bg-secondary border-r border-primary"
    >
      {/* Logo */}
      <div className="flex h-20 items-center px-8 border-b border-primary">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-lg flex items-center justify-center">
            <span className="text-inverse font-bold text-sm font-space-grotesk">F</span>
          </div>
          <span className="text-primary font-space-grotesk font-semibold text-lg">Forma</span>
        </div>
      </div>
      
      {/* Workspace Selector */}
      <div className="px-6 py-4 border-b border-primary">
        <WorkspaceSelector />
      </div>
      
      {/* Navigation */}
      <nav className="mt-4 px-6 flex-1">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-secondary hover:text-primary hover:bg-glass'
                )}
              >
                <item.icon className={cn(
                  'mr-3 h-5 w-5 transition-colors',
                  isActive ? 'text-[var(--accent-primary)]' : 'text-secondary group-hover:text-primary'
                )} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-6 border-t border-primary">
        <UserProfile />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  
  return (
    <SmartRouteGuard 
      requireAuth={true}
      requireEmailVerification={true}
      requireWorkspace={false}
    >
      <div className="min-h-screen bg-[var(--bg-primary)] relative">
        {/* Mobile Navigation */}
        <MobileNavigation />
        
        {/* Desktop Sidebar */}
        <DesktopSidebar pathname={pathname} />

        {/* Main content */}
        <div className="lg:pl-72">
          {/* Mobile header with logo and menu button */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between h-16 px-4 bg-secondary border-b border-primary">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-primary)] rounded-lg flex items-center justify-center">
                  <span className="text-inverse font-bold text-sm font-space-grotesk">F</span>
                </div>
                <span className="text-primary font-space-grotesk font-semibold text-lg">Forma</span>
              </div>
              {/* Space reserved for mobile menu button (positioned absolutely in MobileNavigation) */}
              <div className="w-12 h-12" />
            </div>
          </div>
          
          <main className="py-4 lg:py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        {/* Global Workspace Creation Modal */}
        <WorkspaceCreationModal />
      </div>
    </SmartRouteGuard>
  )
}