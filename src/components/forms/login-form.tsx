'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/contexts/auth-context'
import { AuthPageGuard } from '@/components/shared/auth-page-guard'
import { LoginNavigationHandler } from '@/components/shared/auth-navigation-handler'
import { signInSchema, type SignInInput } from '@/lib/validations/auth'
import type { ZodError } from 'zod'

export function LoginForm() {
  return (
    <AuthPageGuard requiredPath="/auth/login">
      <LoginNavigationHandler />
      <LoginFormContent />
    </AuthPageGuard>
  )
}

function LoginFormContent() {
  const { signIn } = useAuth()
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (field: keyof SignInInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = () => {
    try {
      signInSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      const zodError = error as ZodError
      const fieldErrors: Partial<Record<keyof SignInInput, string>> = {}
      zodError.issues?.forEach((issue) => {
        const field = issue.path[0] as keyof SignInInput
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
      const result = await signIn(formData)
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
          Welcome Back
        </CardTitle>
        <p className="text-center text-[var(--text-secondary)] mt-2">
          Sign in to your Forma account
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
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
