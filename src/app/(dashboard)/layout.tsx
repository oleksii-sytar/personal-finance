import Link from 'next/link'
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  FolderOpen, 
  BarChart3, 
  Settings
} from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { WorkspaceSelector } from '@/components/shared/workspace-selector'
import { WorkspaceCreationModal } from '@/components/shared/workspace-creation-modal'
import { UserProfile } from '@/components/layout/user-profile'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowUpDown },
  { name: 'Categories', href: '/categories', icon: FolderOpen },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard requireWorkspace={false}>
      <div className="min-h-screen bg-[#1C1917] relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="fixed top-[-50%] right-[-50%] w-full h-full bg-gradient-radial from-[#E6A65D]/15 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-[#2A1D15] border-r border-white/5">
        {/* Logo */}
        <div className="flex h-20 items-center px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#E6A65D] to-[#F4B76D] rounded-lg flex items-center justify-center">
              <span className="text-[#1C1917] font-bold text-sm font-space-grotesk">F</span>
            </div>
            <span className="text-white/90 font-space-grotesk font-semibold text-lg">Forma</span>
          </div>
        </div>
        
        {/* Workspace Selector */}
        <div className="px-6 py-4 border-b border-white/5">
          <WorkspaceSelector />
        </div>
        
        {/* Navigation */}
        <nav className="mt-4 px-6">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center px-4 py-3 text-sm font-medium text-white/70 rounded-xl hover:text-white/90 hover:bg-white/5 transition-all duration-300"
              >
                <item.icon className="mr-4 h-5 w-5 group-hover:text-[#E6A65D] transition-colors" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 w-full p-6 border-t border-white/5">
          <UserProfile />
        </div>
      </div>

      {/* Main content */}
      <div className="pl-72">
        <main className="py-8 relative z-10">
          <div className="mx-auto max-w-7xl px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Global Workspace Creation Modal */}
      <WorkspaceCreationModal />
    </div>
    </AuthGuard>
  )
}