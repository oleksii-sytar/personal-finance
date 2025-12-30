import Link from 'next/link'
import { 
  LayoutDashboard, 
  ArrowUpDown, 
  FolderOpen, 
  BarChart3, 
  Settings,
  LogOut,
  User
} from 'lucide-react'

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
        
        {/* Navigation */}
        <nav className="mt-8 px-6">
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
          <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    Family Account
                  </p>
                  <p className="text-xs text-white/50">Premium Plan</p>
                </div>
              </div>
              <button className="ml-3 p-2 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-lg transition-all duration-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
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
    </div>
  )
}