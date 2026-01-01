'use client'

import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

/**
 * User profile component with logout functionality
 * Separated to avoid hydration issues in the main layout
 */
export function UserProfile() {
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect will be handled by the auth context
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/8 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">
              {user?.user_metadata?.full_name || user?.email || 'User'}
            </p>
            <p className="text-xs text-white/50">Family Account</p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="ml-3 p-2 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-lg transition-all duration-300"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}