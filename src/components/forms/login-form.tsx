'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { useErrorHandler } from '@/hooks/use-error-handler'
import { signInSchema, type SignInInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

/**
 * Login form component with validation and error handling
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()
  const { handleAuthError, handleValidationError, handleSuccess } = useErrorHandler()
  
  // Get redirect URL from search params (for invitation flow)
  const redirectTo = searchParams.get('redirect')
  const inviteToken = searchParams.get('token') || searchParams.get('invite_token')
  
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

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
        // Handle authentication errors with proper logging
        handleAuthError(result.error, 'login', { email: formData.email })
        
        // Set form-specific errors
        if (result.error.includes('Invalid login credentials')) {
          setErrors({ email: 'Invalid email or password' })
        } else if (result.error.includes('Email not confirmed')) {
          setErrors({ email: 'Please verify your email address before signing in' })
        } else {
          setErrors({ email: result.error })
        }
      } else {
        // Success - show toast and redirect
        handleSuccess('Welcome back!', 'You have been successfully signed in.')
        
        // Redirect to invitation if there's a redirect URL, otherwise dashboard
        if (redirectTo) {
          router.push(decodeURIComponent(redirectTo))
        } else if (inviteToken) {
          router.push(`/auth/invite?token=${inviteToken}`)
        } else {
          router.push('/dashboard')
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