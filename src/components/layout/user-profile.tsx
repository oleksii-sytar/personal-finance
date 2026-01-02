'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

/**
 * User profile component with logout functionality
 * Separated to avoid hydration issues in the main layout
 */
export function UserProfile() {
  const { signOut, user } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      
      // Redirect to login with logout success parameter
      router.push('/auth/login?logout=success')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false) // Reset loading state on error
      
      // Even on error, redirect to login for security
      router.push('/auth/login?logout=success')
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
          disabled={isSigningOut}
          className="ml-3 p-2 text-white/50 hover:text-white/90 hover:bg-white/10 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isSigningOut ? "Signing out..." : "Sign Out"}
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}