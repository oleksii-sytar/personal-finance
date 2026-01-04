'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Password reset request form component
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function ResetPasswordForm() {
  const router = useRouter()
  const { resetPassword, user, loading } = useAuth()
  
  // Redirect authenticated users to dashboard (client-side guard)
  useEffect(() => {
    if (user) {
      console.log('Redirecting authenticated user from reset password page')
      router.replace('/dashboard')
    }
  }, [user, router])
  
  // Early return for loading state - don't render anything while checking auth
  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
        </CardContent>
      </Card>
    )
  }

  // Don't render form if user is authenticated (will be redirected)
  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
        </CardContent>
      </Card>
    )
  }

  return <ResetPasswordFormContent />
}

function ResetPasswordFormContent() {
  const { resetPassword } = useAuth()
  
  const [formData, setFormData] = useState<PasswordResetRequestInput>({
    email: '',
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordResetRequestInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof PasswordResetRequestInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  /**
   * Validate form data using Zod schema
   * Requirements: 3.2
   */
  const validateForm = (): boolean => {
    try {
      passwordResetRequestSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError
        const fieldErrors: Partial<Record<keyof PasswordResetRequestInput, string>> = {}
        
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof PasswordResetRequestInput
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
   * Requirements: 3.2, 3.3, 3.4
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const result = await resetPassword(formData.email)
      
      if (result.error) {
        setErrors({ email: result.error })
      } else {
        // Always show success message for security (Requirement 3.4)
        setIsSuccess(true)
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setErrors({ email: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle as="h1" className="text-center text-2xl">
            Check Your Email
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#4E7A58]/20 rounded-full flex items-center justify-center mx-auto">
              <svg 
                className="w-8 h-8 text-[#4E7A58]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
            </div>
            
            <p className="text-[var(--text-primary)]">
              If an account with that email exists, you will receive a password reset link.
            </p>
            
            <p className="text-[var(--text-secondary)] text-sm">
              Check your email and follow the instructions to reset your password.
            </p>
            
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors text-sm"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle as="h1" className="text-center text-2xl">
          Reset Password
        </CardTitle>
        <p className="text-center text-[var(--text-secondary)] mt-2">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field - Requirements 3.2 */}
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="Enter your email address"
            disabled={isLoading}
            required
          />
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </Button>
        </form>
        
        {/* Back to Sign In Link */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors text-sm"
          >
            ← Back to Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}