'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { useErrorHandler } from '@/hooks/use-error-handler'
import { usePostLoginCheck } from '@/hooks/use-post-login-check'
import { PendingInvitationsModal } from '@/components/invitations/pending-invitations-modal'
import { signInSchema, type SignInInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Login form component with validation and error handling
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 * Now includes post-login invitation check functionality
 */
export function LoginForm() {
  const router = useRouter()
  const { signIn, user, loading } = useAuth()
  
  // Post-login invitation check
  const { 
    hasPendingInvitations, 
    pendingInvitations, 
    isLoading: checkingInvitations,
    checkComplete 
  } = usePostLoginCheck()
  
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  
  // Handle post-login invitation flow
  useEffect(() => {
    if (user && checkComplete && !checkingInvitations) {
      if (hasPendingInvitations && pendingInvitations.length > 0) {
        console.log('User has pending invitations, showing modal')
        setShowInvitationsModal(true)
      } else {
        console.log('No pending invitations, redirecting to dashboard')
        router.replace('/dashboard')
      }
    }
  }, [user, checkComplete, checkingInvitations, hasPendingInvitations, pendingInvitations, router])
  
  // Redirect authenticated users to dashboard (client-side guard)
  useEffect(() => {
    if (user && !checkingInvitations && checkComplete && !hasPendingInvitations) {
      console.log('Redirecting authenticated user from login page')
      router.replace('/dashboard')
    }
  }, [user, router, checkingInvitations, checkComplete, hasPendingInvitations])
  
  // Early return for loading state - don't render anything while checking auth or invitations
  if (loading || (user && checkingInvitations)) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D]"></div>
          <p className="ml-3 text-white/60">
            {loading ? 'Checking authentication...' : 'Checking for invitations...'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Don't render form if user is authenticated (will be redirected)
  if (user && checkComplete && !hasPendingInvitations) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E6A65D]"></div>
        </CardContent>
      </Card>
    )
  }

  const handleInvitationsProcessed = () => {
    // Refresh the page or redirect to dashboard after invitations are processed
    router.push('/dashboard')
  }

  return (
    <>
      <LoginFormContent />
      
      {/* Pending Invitations Modal */}
      {showInvitationsModal && pendingInvitations.length > 0 && (
        <PendingInvitationsModal
          invitations={pendingInvitations}
          onClose={() => setShowInvitationsModal(false)}
          onInvitationsProcessed={handleInvitationsProcessed}
        />
      )}
    </>
  )
}

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()
  const { handleAuthError, handleValidationError, handleSuccess } = useErrorHandler()
  
  // Get redirect URL from search params (for invitation flow)
  const redirectTo = searchParams.get('redirect')
  const inviteToken = searchParams.get('token') || searchParams.get('invite_token')
  const logoutSuccess = searchParams.get('logout')
  
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutMessage, setShowLogoutMessage] = useState(false)

  // Show logout success message
  useEffect(() => {
    if (logoutSuccess === 'success') {
      setShowLogoutMessage(true)
      
      // Clean up the URL by removing the logout parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('logout')
      window.history.replaceState({}, '', newUrl.toString())
      
      // Hide message after 5 seconds
      const timer = setTimeout(() => {
        setShowLogoutMessage(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [logoutSuccess])

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof SignInInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  /**
   * Validate form data using Zod schema
   * Requirements: 2.1, 2.3
   */
  const validateForm = (): boolean => {
    try {
      signInSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError
        const fieldErrors: Partial<Record<keyof SignInInput, string>> = {}
        
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof SignInInput
          if (field) {
            fieldErrors[field] = issue.message
          }
        })
        
        setErrors(fieldErrors)
      }
      return false
    }
  }

  /**
   * Handle form submission
   * Requirements: 2.1, 2.2, 2.3, 2.6
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const result = await signIn(formData)
      
      if (result.error) {
        // Handle authentication errors
        if (result.error.includes('Invalid login credentials')) {
          setErrors({ email: 'Invalid email or password' })
        } else if (result.error.includes('Email not confirmed')) {
          setErrors({ email: 'Please verify your email address before signing in' })
        } else {
          setErrors({ email: result.error })
        }
      } else {
        // Success - check for invitations or redirect
        if (redirectTo) {
          window.location.href = decodeURIComponent(redirectTo)
        } else if (inviteToken) {
          window.location.href = `/auth/invite?token=${inviteToken}`
        } else {
          // Let the post-login hook handle invitation checking and redirection
          // The hook will either show invitations modal or redirect to dashboard
          console.log('Login successful, letting post-login hook handle next steps')
        }
      }
    } catch (error) {
      setErrors({ email: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle as="h1" className="text-center text-2xl">
          Welcome Back
        </CardTitle>
        <p className="text-center text-white/60 mt-2">
          Sign in to your family finance dashboard
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Logout Success Message */}
        {showLogoutMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Signed out successfully</span>
            </div>
            <p className="text-xs text-green-400/80 mt-1">You have been safely signed out of your account.</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field - Requirements 2.1 */}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={isLoading}
            required
          />
          
          {/* Password Field - Requirements 2.1 */}
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
            required
          />
          
          {/* Remember Me and Forgot Password - Requirements 2.2, 2.5 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange('rememberMe')}
                disabled={isLoading}
                className="w-4 h-4 text-[#E6A65D] bg-white/5 border-white/20 rounded focus:ring-[#E6A65D]/20"
              />
              <span className="ml-2 text-sm text-white/60">Remember me</span>
            </label>
            <Link 
              href="/auth/reset-password" 
              className="text-sm text-[#E6A65D] hover:text-[#F4B76D] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            Don't have an account?{' '}
            <Link
              href={inviteToken ? `/auth/signup?token=${inviteToken}` : '/auth/signup'}
              className="text-[#E6A65D] hover:text-[#F4B76D] transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}