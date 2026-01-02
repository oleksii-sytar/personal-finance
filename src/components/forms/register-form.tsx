'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { usePostLoginCheck } from '@/hooks/use-post-login-check'
import { PendingInvitationsModal } from '@/components/invitations/pending-invitations-modal'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Registration form component with validation and error handling
 * Requirements: 1.2, 1.3, 1.4, 1.7
 * Now includes post-signup invitation check functionality
 */
export function RegisterForm() {
  const router = useRouter()
  const { signUp, user, loading } = useAuth()
  
  // Post-login invitation check (also works after signup)
  const { 
    hasPendingInvitations, 
    pendingInvitations, 
    isLoading: checkingInvitations,
    checkComplete 
  } = usePostLoginCheck()
  
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  
  // Handle post-signup invitation flow
  useEffect(() => {
    if (user && checkComplete && !checkingInvitations) {
      if (hasPendingInvitations && pendingInvitations.length > 0) {
        console.log('New user has pending invitations, showing modal')
        setShowInvitationsModal(true)
      } else {
        console.log('No pending invitations for new user, redirecting to dashboard')
        router.replace('/dashboard')
      }
    }
  }, [user, checkComplete, checkingInvitations, hasPendingInvitations, pendingInvitations, router])
  
  // Redirect authenticated users to dashboard (client-side guard)
  useEffect(() => {
    if (user && !checkingInvitations && checkComplete && !hasPendingInvitations) {
      console.log('Redirecting authenticated user from register page')
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
  const [successMessage, setSuccessMessage] = useState('')

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
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setSuccessMessage('')
    
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
      } else {
        // Success - show verification message (Requirement 1.5)
        setSuccessMessage(result.data?.message || 'Registration successful! Check your email for verification.')
        
        // Clear form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
        })
        
        // For signup, we don't redirect immediately - let the post-login hook handle it
        // The hook will check for invitations and either show modal or redirect to dashboard
        console.log('Registration successful, letting post-login hook handle next steps')
      }
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
        <p className="text-center text-white/60 mt-2">
          Join Forma to start managing your family finances
        </p>
      </CardHeader>
      
      <CardContent>
        {successMessage && (
          <div className="mb-6 p-4 bg-[#4E7A58]/20 border border-[#4E7A58]/30 rounded-xl">
            <p className="text-[#4E7A58] text-sm text-center">
              {successMessage}
            </p>
          </div>
        )}
        
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
          <div className="text-xs text-white/50 space-y-1">
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
          <p className="text-white/60 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="text-[#E6A65D] hover:text-[#F4B76D] transition-colors"
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