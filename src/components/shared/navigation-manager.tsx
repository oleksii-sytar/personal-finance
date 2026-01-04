'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'

/**
 * Navigation context interface for comprehensive user journey management
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
interface NavigationContext {
  currentPath: string
  intendedDestination: string | null
  userContext: {
    isFirstTime: boolean
    hasWorkspace: boolean
    hasPendingInvitations: boolean
    onboardingStep: string | null
    isEmailVerified: boolean
  }
  sessionState: {
    isAuthenticated: boolean
    isValidating: boolean
    lastValidated: Date | null
  }
}

/**
 * Internal NavigationManager component that uses useSearchParams
 */
function NavigationManagerInternal() {
  const [context, setContext] = useState<NavigationContext | null>(null)
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentWorkspace, invitations, loading: workspaceLoading } = useWorkspace()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Determine user context based on current state
  const userContext = useMemo(() => {
    if (!user) {
      return {
        isFirstTime: false,
        hasWorkspace: false,
        hasPendingInvitations: false,
        onboardingStep: null,
        isEmailVerified: false
      }
    }

    const hasPendingInvitations = invitations.length > 0

    return {
      isFirstTime: !user.email_confirmed_at,
      hasWorkspace: !!currentWorkspace,
      hasPendingInvitations,
      onboardingStep: determineOnboardingStep(user, currentWorkspace, hasPendingInvitations, invitations),
      isEmailVerified: !!user.email_confirmed_at
    }
  }, [user, currentWorkspace, invitations])

  // Update navigation context when dependencies change
  useEffect(() => {
    if (authLoading || workspaceLoading) {
      return
    }

    const newContext: NavigationContext = {
      currentPath: pathname,
      intendedDestination: searchParams.get('returnUrl'),
      userContext,
      sessionState: {
        isAuthenticated,
        isValidating: authLoading,
        lastValidated: new Date()
      }
    }

    setContext(newContext)
  }, [
    pathname, 
    searchParams, 
    userContext, 
    isAuthenticated, 
    authLoading, 
    workspaceLoading
  ])

  // Smart navigation decision making based on user context
  const navigateBasedOnContext = useCallback((destination?: string) => {
    if (!context || authLoading || workspaceLoading) {
      return
    }

    const target = destination || determineOptimalDestination(context.userContext, pathname, context.intendedDestination)
    
    // Handle different user scenarios based on requirements 11.1, 11.2, 11.3, 11.4, 11.5
    
    // First-time users need email verification
    if (context.userContext.isFirstTime && !pathname.startsWith('/auth/verify-email')) {
      console.log('NavigationManager: Redirecting first-time user to email verification')
      router.push('/auth/verify-email')
      return
    }

    // Users without workspace need onboarding (but only if authenticated and email verified)
    if (
      context.sessionState.isAuthenticated && 
      context.userContext.isEmailVerified &&
      !context.userContext.hasWorkspace && 
      !pathname.startsWith('/onboarding/') &&
      !pathname.startsWith('/auth/')
    ) {
      console.log('NavigationManager: Redirecting user without workspace to onboarding')
      router.push('/dashboard')
      return
    }

    // Users with pending invitations should see them (but only if authenticated and email verified)
    if (
      context.sessionState.isAuthenticated &&
      context.userContext.isEmailVerified &&
      context.userContext.hasPendingInvitations && 
      !pathname.startsWith('/auth/accept-invitations') &&
      !pathname.startsWith('/auth/') &&
      !pathname.startsWith('/onboarding/')
    ) {
      console.log('NavigationManager: Redirecting user with pending invitations')
      router.push('/auth/accept-invitations')
      return
    }

    // Navigate to intended destination if all requirements are met
    if (target && target !== pathname) {
      console.log('NavigationManager: Navigating to optimal destination:', target)
      router.push(target)
    }
  }, [context, authLoading, workspaceLoading, pathname, router])

  // Trigger navigation when context changes (but not on initial load)
  useEffect(() => {
    if (!context) return

    // Only trigger automatic navigation for authenticated users
    // This prevents unwanted redirects for unauthenticated users browsing public pages
    if (context.sessionState.isAuthenticated) {
      navigateBasedOnContext()
    }
  }, [context, navigateBasedOnContext])

  // This component only manages navigation logic - no UI rendering
  return null
}

/**
 * Determine the current onboarding step for a user
 * Requirements: 11.2, 11.4, 15.1, 15.2, 15.3, 15.4, 15.5
 */
function determineOnboardingStep(
  user: any,
  currentWorkspace: any,
  hasPendingInvitations: boolean,
  invitations: any[]
): string | null {
  if (!user) return null

  // Email verification is the first step
  if (!user.email_confirmed_at) {
    return 'email-verification'
  }

  // Pending invitations take priority over workspace creation
  if (hasPendingInvitations || invitations.length > 0) {
    return 'accept-invitations'
  }

  // Workspace creation if user doesn't have one
  if (!currentWorkspace) {
    return 'workspace-creation'
  }

  // Onboarding complete
  return null
}

/**
 * Determine the optimal destination for a user based on their context
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
function determineOptimalDestination(
  userContext: NavigationContext['userContext'],
  currentPath: string,
  intendedDestination: string | null
): string {
  // If user has a specific intended destination and all requirements are met, honor it
  if (
    intendedDestination && 
    userContext.isEmailVerified && 
    userContext.hasWorkspace && 
    !userContext.hasPendingInvitations
  ) {
    return intendedDestination
  }

  // Prioritize user's current context and onboarding needs
  if (userContext.hasPendingInvitations) {
    return '/auth/accept-invitations'
  }

  if (!userContext.hasWorkspace && userContext.isEmailVerified) {
    return '/dashboard'
  }

  if (!userContext.isEmailVerified) {
    return '/auth/verify-email'
  }

  // Default to dashboard for fully onboarded users
  return '/dashboard'
}

/**
 * NavigationManager component that manages all navigation decisions with full user context awareness
 * Implements context-aware navigation decisions for complete user journey consistency
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function NavigationManager() {
  return (
    <Suspense fallback={null}>
      <NavigationManagerInternal />
    </Suspense>
  )
}