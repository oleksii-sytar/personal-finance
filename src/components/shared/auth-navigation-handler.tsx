'use client'

import { useEffect, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { usePostLoginCheck } from '@/hooks/use-post-login-check'
import { 
  extractReturnUrl, 
  determinePostAuthDestination, 
  clearReturnUrl 
} from '@/lib/utils/return-url'
import { historyManager } from '@/lib/navigation/history-manager'

/**
 * AuthNavigationHandler component for handling post-authentication navigation
 * Only executes on authentication pages to prevent global navigation interference
 * Requirements: 8.1, 8.2, 8.4, 8.5
 */
interface AuthNavigationHandlerProps {
  /** The specific auth page this handler is for */
  authPage: 'login' | 'signup' | 'reset-password' | 'verify-email'
  /** Optional callback when navigation occurs */
  onNavigate?: (destination: string) => void
}

export function AuthNavigationHandler({ 
  authPage, 
  onNavigate 
}: AuthNavigationHandlerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const { 
    hasPendingInvitations, 
    pendingInvitations, 
    checkComplete,
    isLoading: checkingInvitations 
  } = usePostLoginCheck()

  // Verify this handler is only running on the correct auth page
  const isOnCorrectAuthPage = useCallback(() => {
    const authPagePaths = {
      'login': '/auth/login',
      'signup': '/auth/signup',
      'reset-password': '/auth/reset-password',
      'verify-email': '/auth/verify-email'
    }
    
    return pathname === authPagePaths[authPage]
  }, [pathname, authPage])

  // Handle post-authentication navigation
  const handlePostAuthNavigation = useCallback(() => {
    // Only proceed if we're on the correct auth page
    if (!isOnCorrectAuthPage()) {
      console.log(`AuthNavigationHandler: Not on correct auth page (${authPage}), skipping navigation`)
      return
    }

    // Only proceed if user is authenticated and all checks are complete
    if (!isAuthenticated || !user || authLoading || workspaceLoading || checkingInvitations || !checkComplete) {
      return
    }

    console.log(`AuthNavigationHandler (${authPage}): Handling post-auth navigation for user:`, user.email)

    // Extract return URL from both search params and history manager
    const returnUrlFromParams = extractReturnUrl(searchParams)
    const returnUrlFromHistory = historyManager.getReturnUrl()
    const returnUrl = returnUrlFromParams || returnUrlFromHistory
    const inviteToken = searchParams.get('token') || searchParams.get('invite_token')
    
    // Determine user context for navigation decisions
    const userContext = {
      isFirstTime: !user.email_confirmed_at,
      hasWorkspace: !!currentWorkspace,
      hasPendingInvitations: hasPendingInvitations || pendingInvitations.length > 0,
      isEmailVerified: !!user.email_confirmed_at
    }

    console.log(`AuthNavigationHandler (${authPage}): User context:`, userContext)

    let destination: string

    // Handle different post-auth scenarios based on requirements 8.1, 8.2, 8.4, 8.5

    // 1. Invitation flow takes highest priority
    if (inviteToken) {
      destination = `/auth/invite?token=${inviteToken}`
      console.log(`AuthNavigationHandler (${authPage}): Redirecting to invitation flow`)
    }
    // 2. Pending invitations (for existing users who just logged in)
    else if (userContext.hasPendingInvitations && userContext.isEmailVerified) {
      destination = '/auth/accept-invitations'
      console.log(`AuthNavigationHandler (${authPage}): User has pending invitations`)
    }
    // 3. First-time users need email verification
    else if (userContext.isFirstTime) {
      destination = '/auth/verify-email'
      console.log(`AuthNavigationHandler (${authPage}): First-time user needs email verification`)
    }
    // 4. Users without workspace need onboarding (only if email verified)
    else if (userContext.isEmailVerified && !userContext.hasWorkspace) {
      destination = '/dashboard'
      console.log(`AuthNavigationHandler (${authPage}): User needs workspace creation`)
    }
    // 5. Return URL if user meets all requirements
    else if (returnUrl && userContext.isEmailVerified && userContext.hasWorkspace) {
      destination = returnUrl
      console.log(`AuthNavigationHandler (${authPage}): Returning to intended destination:`, returnUrl)
      // Clear the return URL from both sources since we're using it
      clearReturnUrl()
      historyManager.clearReturnUrl()
    }
    // 6. Default to dashboard for fully authenticated users
    else if (userContext.isEmailVerified && userContext.hasWorkspace) {
      destination = '/dashboard'
      console.log(`AuthNavigationHandler (${authPage}): Redirecting to dashboard`)
    }
    // 7. Fallback - should not happen but handle gracefully
    else {
      destination = '/dashboard'
      console.log(`AuthNavigationHandler (${authPage}): Fallback redirect to dashboard`)
    }

    // Execute navigation with proper history state
    console.log(`AuthNavigationHandler (${authPage}): Navigating to:`, destination)
    
    // Call optional callback
    if (onNavigate) {
      onNavigate(destination)
    }

    // Map authPage to HistoryState authFlow values
    const authFlowMap: Record<string, 'login' | 'register' | 'reset-password' | 'verify-email'> = {
      'login': 'login',
      'signup': 'register',
      'reset-password': 'reset-password',
      'verify-email': 'verify-email',
    }

    // Perform navigation with history state management
    historyManager.navigate(destination, {
      replace: true, // Replace current auth page in history
      state: {
        authFlow: authFlowMap[authPage],
        preserveHistory: true,
        timestamp: Date.now()
      }
    })
    
    // Also use Next.js router for client-side navigation
    router.push(destination)
  }, [
    isOnCorrectAuthPage,
    authPage,
    isAuthenticated,
    user,
    authLoading,
    workspaceLoading,
    checkingInvitations,
    checkComplete,
    searchParams,
    currentWorkspace,
    hasPendingInvitations,
    pendingInvitations,
    onNavigate,
    router
  ])

  // Handle navigation when authentication state changes
  useEffect(() => {
    // Only handle navigation if user just became authenticated
    if (isAuthenticated && user && checkComplete) {
      // Add a small delay to ensure all state is settled
      const timeoutId = setTimeout(() => {
        handlePostAuthNavigation()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [isAuthenticated, user, checkComplete, handlePostAuthNavigation])

  // This component only manages navigation logic - no UI rendering
  return null
}

/**
 * Convenience components for specific auth pages
 * These ensure type safety and correct page association
 */
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