'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { createLoginUrlWithReturn } from '@/lib/utils/return-url'
import { historyManager } from '@/lib/navigation/history-manager'

/**
 * Enhanced route protection props with comprehensive user context awareness
 * Requirements: 7.1, 7.2, 7.4, 12.1, 12.2
 */
interface SmartRouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireWorkspace?: boolean
  requireEmailVerification?: boolean
  allowedRoles?: string[]
  fallbackComponent?: React.ComponentType
  loadingComponent?: React.ComponentType
}

/**
 * Internal component that uses useSearchParams
 */
function SmartRouteGuardInternal({ 
  children, 
  requireAuth = true,
  requireWorkspace = false,
  requireEmailVerification = false,
  allowedRoles = [],
  fallbackComponent: FallbackComponent,
  loadingComponent: LoadingComponent = LoadingSpinner
}: SmartRouteGuardProps) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { currentWorkspace, members, loading: workspaceLoading } = useWorkspace()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Get user's role in current workspace
  const userRole = members.find(m => m.user_id === user?.id)?.role

  // Check authentication requirements (Requirements: 7.1, 7.2)
  useEffect(() => {
    if (authLoading || workspaceLoading || isRedirecting) return

    if (requireAuth && !isAuthenticated) {
      setIsRedirecting(true)
      
      // Set return URL in history manager for proper restoration
      historyManager.setReturnUrl(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))
      
      const loginUrl = createLoginUrlWithReturn(
        pathname, 
        searchParams.toString(),
        'required'
      )
      router.push(loginUrl)
      return
    }

    // Check email verification (Requirements: 7.2, 12.1)
    if (requireEmailVerification && user && !user.email_confirmed_at) {
      setIsRedirecting(true)
      
      // Preserve current location for return after verification
      historyManager.setReturnUrl(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))
      
      router.push('/auth/verify-email')
      return
    }

    // Check workspace requirements (Requirements: 7.4, 12.2)
    if (requireWorkspace && isAuthenticated && user?.email_confirmed_at && !currentWorkspace) {
      setIsRedirecting(true)
      
      // Preserve current location for return after workspace creation
      historyManager.setReturnUrl(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))
      
      router.push('/dashboard')
      return
    }

    // Reset redirecting state if all checks pass
    setIsRedirecting(false)
  }, [
    requireAuth,
    requireEmailVerification,
    requireWorkspace,
    isAuthenticated,
    user,
    currentWorkspace,
    authLoading,
    workspaceLoading,
    pathname,
    searchParams,
    router,
    isRedirecting
  ])

  // Enhanced loading state with context
  if (authLoading || workspaceLoading || isRedirecting) {
    return <LoadingComponent />
  }

  // Don't render children if requirements are not met
  if (requireAuth && !isAuthenticated) {
    return <LoadingComponent />
  }

  if (requireEmailVerification && user && !user.email_confirmed_at) {
    return <LoadingComponent />
  }

  if (requireWorkspace && !currentWorkspace && isAuthenticated && user?.email_confirmed_at) {
    return <LoadingComponent />
  }

  // Check role requirements (Requirements: 12.1, 12.2)
  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return FallbackComponent ? <FallbackComponent /> : (
      <div className="p-4 text-center">
        <p className="text-red-600">Access denied. Insufficient permissions.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Required role: {allowedRoles.join(' or ')}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Simplified route guard for basic authentication checks
 * Maintains backward compatibility while providing enhanced features
 */
export function RouteGuard({ 
  children, 
  requireAuth = true,
  requireWorkspace = false,
  redirectTo = '/auth/login'
}: {
  children: React.ReactNode
  requireAuth?: boolean
  requireWorkspace?: boolean
  redirectTo?: string
}) {
  return (
    <SmartRouteGuard
      requireAuth={requireAuth}
      requireWorkspace={requireWorkspace}
      requireEmailVerification={requireAuth}
    >
      {children}
    </SmartRouteGuard>
  )
}

/**
 * SmartRouteGuard component that provides intelligent route protection
 * Replaces existing AuthGuard with enhanced route protection and user context awareness
 * Requirements: 7.1, 7.2, 7.4, 12.1, 12.2
 */
export function SmartRouteGuard(props: SmartRouteGuardProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SmartRouteGuardInternal {...props} />
    </Suspense>
  )
}