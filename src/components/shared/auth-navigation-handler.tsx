'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { extractReturnUrl, clearReturnUrl } from '@/lib/utils/return-url'
import { historyManager } from '@/lib/navigation/history-manager'

interface AuthNavigationHandlerProps {
  authPage: 'login' | 'signup' | 'reset-password' | 'verify-email'
  onNavigate?: (destination: string) => void
}

export function AuthNavigationHandler({
  authPage,
  onNavigate,
}: AuthNavigationHandlerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading } = useAuth()

  const isOnCorrectAuthPage = useCallback(() => {
    const authPagePaths = {
      login: '/auth/login',
      signup: '/auth/signup',
      'reset-password': '/auth/reset-password',
      'verify-email': '/auth/verify-email',
    }

    return pathname === authPagePaths[authPage]
  }, [pathname, authPage])

  useEffect(() => {
    if (!isOnCorrectAuthPage() || !isAuthenticated || !user || loading) return

    const returnUrl = extractReturnUrl(searchParams) || historyManager.getReturnUrl()
    const destination = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard'

    clearReturnUrl()
    historyManager.clearReturnUrl()
    onNavigate?.(destination)
    router.replace(destination)
  }, [
    isOnCorrectAuthPage,
    isAuthenticated,
    user,
    loading,
    searchParams,
    onNavigate,
    router,
  ])

  return null
}

export function LoginNavigationHandler(props: Omit<AuthNavigationHandlerProps, 'authPage'>) {
  return <AuthNavigationHandler {...props} authPage="login" />
}

export function SignupNavigationHandler(props: Omit<AuthNavigationHandlerProps, 'authPage'>) {
  return <AuthNavigationHandler {...props} authPage="signup" />
}

export function ResetPasswordNavigationHandler(props: Omit<AuthNavigationHandlerProps, 'authPage'>) {
  return <AuthNavigationHandler {...props} authPage="reset-password" />
}

export function VerifyEmailNavigationHandler(props: Omit<AuthNavigationHandlerProps, 'authPage'>) {
  return <AuthNavigationHandler {...props} authPage="verify-email" />
}
