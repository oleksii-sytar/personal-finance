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
    <div className="bg-[var(--bg-glass)] backdrop-blur-[var(--glass-blur)] border border-[var(--glass-border)] rounded-2xl p-4 transition-all duration-300 w-full max-w-sm">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-[var(--bg-glass)] border border-[var(--glass-border)] rounded-lg flex items-center justify-center">
          <User className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={user?.user_metadata?.full_name || user?.email || 'User'}>
            {user?.user_metadata?.full_name || user?.email || 'User'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] truncate">Family Account</p>
        </div>
        <button 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex-shrink-0 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass)] rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isSigningOut ? "Signing out..." : "Sign Out"}
          aria-label={isSigningOut ? "Signing out..." : "Sign Out"}
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