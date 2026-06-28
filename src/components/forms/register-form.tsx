'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { AuthPageGuard } from '@/components/shared/auth-page-guard'
import { SignupNavigationHandler } from '@/components/shared/auth-navigation-handler'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

export function RegisterForm() {
  return (
    <AuthPageGuard requiredPath="/auth/signup">
      <SignupNavigationHandler />
      <RegisterFormContent />
    </AuthPageGuard>
  )
}

function RegisterFormContent() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (field: keyof SignUpInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    try {
      signUpSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      const zodError = error as ZodError
      const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {}
      zodError.issues?.forEach((issue) => {
        const field = issue.path[0] as keyof SignUpInput
        if (field) fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const result = await signUp(formData)
      if (result.error) {
        setErrors({ email: result.error })
      }
    } catch {
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
          Join Forma and start from a clean account
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>Password must contain:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>At least 8 characters</li>
              <li>At least one letter</li>
              <li>At least one number</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

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
