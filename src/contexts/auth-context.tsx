'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/session/session-manager'
import type { User, Session } from '@supabase/supabase-js'
import type { SignInInput, SignUpInput } from '@/lib/validations/auth'

/**
 * Authentication context types following the design document specifications
 * State-only context without navigation side effects
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
interface AuthContextType {
  // State access only - no navigation side effects
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  
  // Actions that don't trigger automatic redirects
  signIn: (credentials: SignInInput) => Promise<AuthResult>
  signUp: (credentials: SignUpInput) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  
  // Session validation without side effects
  validateSession: () => Promise<boolean>
}

interface AuthResult {
  data?: any
  error?: string
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider component that manages authentication state
 * Provides authentication state without navigation side effects
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  // Session validation without automatic redirects
  const validateSession = useCallback(async () => {
    const isValid = await sessionManager.validateSession()
    const state = sessionManager.getState()
    
    setSession(state.session)
    setUser(state.user)
    setLoading(false)
    
    return isValid
  }, [])

  // Initialize session on mount without redirects
  useEffect(() => {
    validateSession()
  }, [validateSession])

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Update session manager state
        if (session) {
          sessionManager.getState().session = session
          sessionManager.getState().user = session.user
          sessionManager.getState().isValid = true
          sessionManager.getState().lastValidated = new Date()
        } else {
          sessionManager.clearSession()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  /**
   * Sign in with email and password
   * Returns result without triggering navigation
   * Requirements: 6.1, 6.2, 6.3
   */
  const signIn = async (credentials: SignInInput): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        // Return generic error message for security
        return { error: 'Invalid email or password' }
      }

      return { data }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  /**
   * Sign up with email, password, and full name
   * Returns result without triggering navigation
   * Requirements: 6.1, 6.2, 6.3
   */
  const signUp = async (credentials: SignUpInput): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
          },
        },
      })

      if (error) {
        // Handle specific signup errors
        if (error.message.includes('already registered')) {
          return { error: 'An account with this email already exists' }
        }
        return { error: error.message }
      }

      // Fallback: If user was created but profile creation might have failed,
      // try to create the profile manually
      if (data.user && !error) {
        try {
          const { error: profileError } = await supabase.rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: data.user.email,
            full_name: credentials.fullName
          })
          
          if (profileError) {
            console.warn('Profile creation fallback failed:', profileError)
            // Don't fail the signup for this
          }
        } catch (profileError) {
          console.warn('Profile creation fallback error:', profileError)
          // Don't fail the signup for this
        }
      }

      return { 
        data: { 
          message: 'Check your email for verification link',
          user: data.user 
        } 
      }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  /**
   * Sign out current user without automatic redirect
   * Navigation should be handled by components that call this
   * Requirements: 6.1, 6.2, 6.4
   */
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      
      // Clear session manager state
      sessionManager.clearSession()
      
      // No automatic redirect - let calling components handle navigation
    } catch (error) {
      console.error('Sign out error:', error)
      // Even if there's an error, clear the session state
      sessionManager.clearSession()
    }
  }

  /**
   * Request password reset without navigation side effects
   * Requirements: 6.1, 6.2, 6.3
   */
  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
      })

      if (error) {
        console.error('Password reset error:', error)
      }

      // Always return success message for security
      return { 
        data: { 
          message: 'If an account with that email exists, you will receive a password reset link.' 
        } 
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signOut,
    resetPassword,
    validateSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume authentication context
 * Provides authentication state without navigation side effects
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}