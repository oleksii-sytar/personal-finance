/**
 * React hook for performance monitoring
 * Requirements: 12.5, 14.5
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { 
  trackComponentInstantiation, 
  trackPageRefresh, 
  trackNavigation,
  getPerformanceSummary,
  type PageRefreshMetric
} from '@/lib/utils/performance-monitor'

interface UsePerformanceMonitorOptions {
  componentName?: string
  shouldTrackInstantiation?: boolean
  shouldTrackPageRefresh?: boolean
  shouldTrackNavigation?: boolean
}

/**
 * Hook for tracking component performance and behavior
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const {
    componentName,
    shouldTrackInstantiation = false,
    shouldTrackPageRefresh = false,
    shouldTrackNavigation = false
  } = options

  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  const previousPathname = useRef<string>(pathname)
  const hasTrackedInstantiation = useRef<boolean>(false)

  // Track component instantiation
  useEffect(() => {
    if (shouldTrackInstantiation && componentName && !hasTrackedInstantiation.current) {
      // Determine if component should have loaded based on route
      const shouldHaveLoaded = determineShouldHaveLoaded(componentName, pathname)
      
      trackComponentInstantiation(componentName, pathname, shouldHaveLoaded)
      hasTrackedInstantiation.current = true
    }
  }, [componentName, pathname, shouldTrackInstantiation])

  // Track page refresh behavior
  useEffect(() => {
    if (shouldTrackPageRefresh && typeof window !== 'undefined') {
      const navigationEntries = performance.getEntriesByType('navigation')
      const isPageRefresh = navigationEntries.length > 0 && 
        (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload'
      
      if (isPageRefresh) {
        const authState: PageRefreshMetric['authState'] = loading ? 'loading' : 
                        isAuthenticated ? 'authenticated' : 'unauthenticated'
        
        trackPageRefresh(pathname, authState)
      }
    }
  }, [pathname, isAuthenticated, loading, shouldTrackPageRefresh])

  // Track navigation between routes
  useEffect(() => {
    if (shouldTrackNavigation && previousPathname.current !== pathname) {
      const authState: PageRefreshMetric['authState'] = loading ? 'loading' : 
                      isAuthenticated ? 'authenticated' : 'unauthenticated'
      
      trackNavigation(previousPathname.current, pathname, false, authState)
      previousPathname.current = pathname
    }
  }, [pathname, isAuthenticated, loading, shouldTrackNavigation])

  return {
    getPerformanceSummary,
    trackComponentInstantiation: (name: string, shouldHaveLoaded: boolean) => 
      trackComponentInstantiation(name, pathname, shouldHaveLoaded),
    trackPageRefresh: (authState: PageRefreshMetric['authState']) => 
      trackPageRefresh(pathname, authState),
    trackNavigation: (fromRoute: string, toRoute: string, wasRedirect: boolean) => {
      const authState: PageRefreshMetric['authState'] = loading ? 'loading' : 
                      isAuthenticated ? 'authenticated' : 'unauthenticated'
      trackNavigation(fromRoute, toRoute, wasRedirect, authState)
    }
  }
}

/**
 * Hook specifically for auth components to track proper isolation
 */
export function useAuthComponentMonitor(componentName: string) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Track that this auth component was instantiated
    const shouldHaveLoaded = determineShouldHaveLoaded(componentName, pathname)
    trackComponentInstantiation(componentName, pathname, shouldHaveLoaded)
    
    // Log warning if component loaded on wrong route
    if (!shouldHaveLoaded) {
      console.warn(`🚨 Auth component ${componentName} instantiated on wrong route: ${pathname}`)
    }
  }, [componentName, pathname])

  return {
    shouldHaveLoaded: determineShouldHaveLoaded(componentName, pathname),
    currentRoute: pathname
  }
}

/**
 * Hook for tracking page refresh route preservation
 */
export function usePageRefreshMonitor() {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navigationEntries = performance.getEntriesByType('navigation')
      const isPageRefresh = navigationEntries.length > 0 && 
        (navigationEntries[0] as PerformanceNavigationTiming).type === 'reload'
      
      if (isPageRefresh) {
        const authState: PageRefreshMetric['authState'] = loading ? 'loading' : 
                        isAuthenticated ? 'authenticated' : 'unauthenticated'
        
        trackPageRefresh(pathname, authState)
        
        // Log success/failure of route preservation
        const expectedRoute = sessionStorage.getItem('expected-route-after-refresh')
        if (expectedRoute && expectedRoute !== pathname) {
          console.error(`❌ Route not preserved after refresh. Expected: ${expectedRoute}, Got: ${pathname}`)
        } else if (expectedRoute === pathname) {
          console.log(`✅ Route preserved after refresh: ${pathname}`)
        }
        
        // Clear the expected route
        sessionStorage.removeItem('expected-route-after-refresh')
      } else {
        // Store current route for refresh tracking
        sessionStorage.setItem('expected-route-after-refresh', pathname)
      }
    }
  }, [pathname, isAuthenticated, loading])
}

/**
 * Determine if a component should have loaded based on its name and current route
 */
function determineShouldHaveLoaded(componentName: string, pathname: string): boolean {
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/auth/verify-email', '/auth/accept-invitations']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  switch (componentName) {
    case 'LoginForm':
    case 'LazyLoginForm':
      return pathname === '/auth/login'
    
    case 'RegisterForm':
    case 'LazyRegisterForm':
      return pathname === '/auth/signup'
    
    case 'ResetPasswordForm':
    case 'LazyResetPasswordForm':
      return pathname.startsWith('/auth/reset-password')
    
    case 'VerifyEmailForm':
    case 'LazyVerifyEmailForm':
      return pathname === '/auth/verify-email'
    
    case 'InviteAcceptanceForm':
    case 'LazyInviteAcceptanceForm':
      return pathname === '/auth/accept-invitations'
    
    case 'WorkspaceCreationForm':
    case 'LazyWorkspaceCreationForm':
      return pathname.startsWith('/onboarding/workspace') || pathname === '/onboarding'
    
    case 'AuthPageGuard':
    case 'AuthNavigationHandler':
    case 'AuthSyncManager':
      return isAuthRoute
    
    case 'SmartRouteGuard':
    case 'NavigationManager':
      return true // These should load globally
    
    default:
      return true // Unknown components are assumed to be correctly loaded
  }
}