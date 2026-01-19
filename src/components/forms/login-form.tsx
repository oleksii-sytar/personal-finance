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
import { AuthPageGuard } from '@/components/shared/auth-page-guard'
import { LoginNavigationHandler } from '@/components/shared/auth-navigation-handler'
import { AuthSyncManager } from '@/components/shared/auth-sync-manager'
import { signInSchema, type SignInInput } from '@/lib/validations/auth'
import { 
  extractReturnUrl, 
  determinePostAuthDestination, 
  clearReturnUrl 
} from '@/lib/utils/return-url'
import type { ZodError } from 'zod'

/**
 * Login form component with validation and error handling
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 * Now includes post-login invitation check functionality
 * Wrapped with AuthPageGuard to ensure it only renders on /auth/login
 */
export function LoginForm() {
  return (
    <AuthPageGuard requiredPath="/auth/login">
      <LoginFormImplementation />
    </AuthPageGuard>
  )
}

function LoginFormImplementation() {
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
  
  // Handle post-login invitation modal display
  useEffect(() => {
    if (user && checkComplete && !checkingInvitations && hasPendingInvitations && pendingInvitations.length > 0) {
      setShowInvitationsModal(true)
    }
  }, [user, checkComplete, checkingInvitations, hasPendingInvitations, pendingInvitations])
  
  // Early return for loading state - don't render anything while checking auth or invitations
  if (loading || (user && checkingInvitations)) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
          <p className="ml-3 text-[var(--text-secondary)]">
            {loading ? 'Checking authentication...' : 'Checking for invitations...'}
          </p>
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
      {/* AuthNavigationHandler handles all post-authentication navigation */}
      <LoginNavigationHandler />
      
      {/* AuthSyncManager handles cross-tab synchronization */}
      <AuthSyncManager />
      
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
  
  // Extract return URL using the new utility system
  const returnUrl = extractReturnUrl(searchParams)
  const inviteToken = searchParams.get('token') || searchParams.get('invite_token')
  const logoutSuccess = searchParams.get('logout')
  const reason = searchParams.get('reason') // expired, required, invalid
  
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutMessage, setShowLogoutMessage] = useState(false)
  const [showReasonMessage, setShowReasonMessage] = useState(false)

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

  // Show reason message (session expired, etc.)
  useEffect(() => {
    if (reason) {
      setShowReasonMessage(true)
      
      // Clean up the URL by removing the reason parameter
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('reason')
      window.history.replaceState({}, '', newUrl.toString())
      
      // Hide message after 8 seconds
      const timer = setTimeout(() => {
        setShowReasonMessage(false)
      }, 8000)
      
      return () => clearTimeout(timer)
    }
  }, [reason])

  const getReasonMessage = () => {
    switch (reason) {
      case 'expired':
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please sign in again to continue.',
          type: 'warning' as const
        }
      case 'required':
        return {
          title: 'Authentication Required',
          message: 'Please sign in to access this page.',
          type: 'info' as const
        }
      case 'invalid':
        return {
          title: 'Invalid Session',
          message: 'Your session is invalid. Please sign in again.',
          type: 'warning' as const
        }
      default:
        return null
    }
  }

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
        // Success - AuthNavigationHandler will handle the navigation
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
        <p className="text-center text-[var(--text-secondary)] mt-2">
          Sign in to your family finance dashboard
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Logout Success Message */}
        {showLogoutMessage && (
          <div className="mb-4 p-3 bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 rounded-lg">
            <div className="flex items-center gap-2 text-[var(--accent-success)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Signed out successfully</span>
            </div>
            <p className="text-xs text-[var(--accent-success)]/80 mt-1">You have been safely signed out of your account.</p>
          </div>
        )}

        {/* Reason Message (session expired, etc.) */}
        {showReasonMessage && getReasonMessage() && (
          <div className={`mb-4 p-3 rounded-lg ${
            getReasonMessage()?.type === 'warning' 
              ? 'bg-[var(--accent-warning)]/10 border border-[var(--accent-warning)]/20' 
              : 'bg-[var(--accent-info)]/10 border border-[var(--accent-info)]/20'
          }`}>
            <div className={`flex items-center gap-2 ${
              getReasonMessage()?.type === 'warning' 
                ? 'text-[var(--accent-warning)]' 
                : 'text-[var(--accent-info)]'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium">{getReasonMessage()?.title}</span>
            </div>
            <p className={`text-xs mt-1 ${
              getReasonMessage()?.type === 'warning' 
                ? 'text-[var(--accent-warning)]/80' 
                : 'text-[var(--accent-info)]/80'
            }`}>
              {getReasonMessage()?.message}
            </p>
            {returnUrl && (
              <p className="text-xs mt-1 text-[var(--text-muted)]">
                You'll be redirected to: {returnUrl}
              </p>
            )}
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
                className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-glass)] border-[var(--glass-border)] rounded focus:ring-[var(--accent-primary)]/20"
              />
              <span className="ml-2 text-sm text-[var(--text-secondary)]">Remember me</span>
            </label>
            <Link 
              href="/auth/reset-password" 
              className="text-sm text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors"
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
          <p className="text-[var(--text-secondary)] text-sm">
            Don't have an account?{' '}
            <Link
              href={inviteToken ? `/auth/signup?token=${inviteToken}` : '/auth/signup'}
              className="text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}