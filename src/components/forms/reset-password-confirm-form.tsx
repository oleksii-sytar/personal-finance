'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import { passwordResetConfirmSchema, type PasswordResetConfirmInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Password reset confirmation form component
 * Requirements: 3.5, 3.6, 3.7
 */
export function ResetPasswordConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [formData, setFormData] = useState<PasswordResetConfirmInput>({
    token: '',
    password: '',
    confirmPassword: '',
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordResetConfirmInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  /**
   * Extract token from URL parameters on component mount
   * Requirements: 3.5, 3.6
   */
  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    if (type === 'recovery' && token) {
      setFormData(prev => ({ ...prev, token }))
    } else {
      setTokenError('Invalid or missing reset token. Please request a new password reset.')
    }
  }, [searchParams])

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof PasswordResetConfirmInput) => (
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
   * Requirements: 3.7
   */
  const validateForm = (): boolean => {
    try {
      passwordResetConfirmSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError
        const fieldErrors: Partial<Record<keyof PasswordResetConfirmInput, string>> = {}
        
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof PasswordResetConfirmInput
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
   * Requirements: 3.6, 3.7
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })
      
      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setTokenError('This reset link has expired or is invalid. Please request a new password reset.')
        } else {
          setErrors({ password: error.message })
        }
      } else {
        setIsSuccess(true)
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    } catch (error) {
      console.error('Password reset confirmation error:', error)
      setErrors({ password: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // Token error state
  if (tokenError) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle as="h1" className="text-center text-2xl">
            Invalid Reset Link
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--accent-error)]/20 rounded-full flex items-center justify-center mx-auto">
              <svg 
                className="w-8 h-8 text-[var(--accent-error)]" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <p className="text-[var(--text-primary)]">
              {tokenError}
            </p>
            
            <div className="space-y-2">
              <Link
                href="/auth/reset-password"
                className="block w-full"
              >
                <Button className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              
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

  // Success state
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle as="h1" className="text-center text-2xl">
            Password Reset Successful
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
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            
            <p className="text-[var(--text-primary)]">
              Your password has been successfully reset.
            </p>
            
            <p className="text-[var(--text-secondary)] text-sm">
              You will be redirected to the sign in page in a few seconds.
            </p>
            
            <Link
              href="/auth/login"
              className="text-[var(--accent-primary)] hover:text-[#F4B76D] transition-colors text-sm"
            >
              Sign In Now →
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle as="h1" className="text-center text-2xl">
          Set New Password
        </CardTitle>
        <p className="text-center text-[var(--text-secondary)] mt-2">
          Enter your new password below
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password Field - Requirements 3.7 */}
          <Input
            label="New Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            placeholder="Enter your new password"
            disabled={isLoading}
            required
          />
          
          {/* Confirm Password Field - Requirements 3.7 */}
          <Input
            label="Confirm New Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            placeholder="Confirm your new password"
            disabled={isLoading}
            required
          />
          
          {/* Password Requirements */}
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>Password must:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Be at least 8 characters long</li>
              <li>Contain at least one letter</li>
              <li>Contain at least one number</li>
            </ul>
          </div>
          
          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Updating Password...' : 'Update Password'}
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