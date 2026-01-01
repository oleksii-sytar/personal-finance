'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { SignInInput, SignUpInput } from '@/lib/validations/auth'

/**
 * Authentication context types following the design document specifications
 * Requirements: 2.4, 7.2, 7.3
 */
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (credentials: SignInInput) => Promise<AuthResult>
  signUp: (credentials: SignUpInput) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
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
 * Implements session management with persistence across browser refresh
 * Requirements: 2.4, 7.2, 7.3
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          // Clear any cached data on sign out
          setUser(null)
          setSession(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  /**
   * Sign in with email and password
   * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
   */
  const signIn = async (credentials: SignInInput): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        // Return generic error message for security (Requirement 2.3)
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
   * Requirements: 1.2, 1.3, 1.4, 1.5, 1.7
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
   * Sign out current user
   * Requirements: 7.1, 7.2, 7.3
   */
  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      // State will be updated by the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  /**
   * Request password reset
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  const resetPassword = async (email: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`,
      })

      if (error) {
        console.error('Password reset error:', error)
      }

      // Always return success message for security (Requirement 3.4)
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
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to consume authentication context
 * Requirements: 2.4, 7.2, 7.3
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}