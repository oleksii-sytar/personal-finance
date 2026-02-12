'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { usePostLoginCheck } from '@/hooks/use-post-login-check'
import { PendingInvitationsModal } from '@/components/invitations/pending-invitations-modal'
import { AuthPageGuard } from '@/components/shared/auth-page-guard'
import { SignupNavigationHandler } from '@/components/shared/auth-navigation-handler'
import { AuthSyncManager } from '@/components/shared/auth-sync-manager'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Registration form component with validation and error handling
 * Requirements: 1.2, 1.3, 1.4, 1.7
 * Now includes post-signup invitation check functionality
 * Wrapped with AuthPageGuard to ensure it only renders on /auth/signup
 */
export function RegisterForm() {
  return (
    <AuthPageGuard requiredPath="/auth/signup">
      <RegisterFormImplementation />
    </AuthPageGuard>
  )
}

function RegisterFormImplementation() {
  const router = useRouter()
  const { signUp, user, loading } = useAuth()
  
  // Post-signup invitation check (also works after signup)
  const { 
    hasPendingInvitations, 
    pendingInvitations, 
    isLoading: checkingInvitations,
    checkComplete 
  } = usePostLoginCheck()
  
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  
  // Handle post-signup invitation modal display
  useEffect(() => {
    if (user && checkComplete && !checkingInvitations && hasPendingInvitations && pendingInvitations.length > 0) {
      console.log('New user has pending invitations, showing modal')
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
      <SignupNavigationHandler />
      
      {/* AuthSyncManager handles cross-tab synchronization */}
      <AuthSyncManager />
      
      <RegisterFormContent />
      
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

function RegisterFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp } = useAuth()
  
  // Get invitation token from URL if present
  const inviteToken = searchParams.get('token') || searchParams.get('invite_token')
  
  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof SignUpInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  /**
   * Validate form data using Zod schema
   * Requirements: 1.2, 1.3, 1.4, 1.7
   */
  const validateForm = (): boolean => {
    try {
      signUpSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError
        const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {}
        
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof SignUpInput
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
   * Requirements: 1.2, 1.3, 1.4, 1.5, 1.7
   * Now automatically redirects to dashboard after successful signup
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Create FormData and include invitation token if present
      const formDataToSubmit = new FormData()
      formDataToSubmit.set('email', formData.email)
      formDataToSubmit.set('password', formData.password)
      formDataToSubmit.set('confirmPassword', formData.confirmPassword)
      formDataToSubmit.set('fullName', formData.fullName)
      
      if (inviteToken) {
        formDataToSubmit.set('inviteToken', inviteToken)
      }
      
      // Import and call the server action directly
      const { signUpAction } = await import('@/actions/auth')
      const result = await signUpAction(formDataToSubmit)
      
      if (result.error) {
        // Handle server-side errors (Requirement 1.7)
        if (typeof result.error === 'string') {
          if (result.error.includes('already exists')) {
            setErrors({ email: result.error })
          } else {
            setErrors({ email: result.error })
          }
        } else {
          // Handle validation errors
          const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {}
          Object.entries(result.error).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[field as keyof SignUpInput] = messages[0]
            }
          })
          setErrors(fieldErrors)
        }
      }
      // If successful, the server action will redirect to dashboard
      // No need to handle success case here
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ email: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle as="h1" className="text-center text-2xl">
          Create Your Account
        </CardTitle>
        <p className="text-center text-[var(--text-secondary)] mt-2">
          Join Forma to start managing your family finances
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Field - Requirement 1.2 */}
          <Input
            label="Full Name"
            type="text"
            value={formData.fullName}
            onChange={handleChange('fullName')}
            error={errors.fullName}
            placeholder="Enter your full name"
            autoComplete="name"
            disabled={isLoading}
            required
          />
          
          {/* Email Field - Requirements 1.2, 1.4 */}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="Enter your email address"
            autoComplete="email"
            disabled={isLoading}
            required
          />
          
          {/* Password Field - Requirements 1.2, 1.3 */}
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            placeholder="Create a strong password"
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
          
          {/* Confirm Password Field - Requirement 1.2 */}
          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={isLoading}
            required
          />
          
          {/* Password Requirements Helper Text */}
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>Password must contain:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>At least 8 characters</li>
              <li>At least one letter</li>
              <li>At least one number</li>
            </ul>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        
        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors"
              disabled={isLoading}
            >
              Sign in here
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}