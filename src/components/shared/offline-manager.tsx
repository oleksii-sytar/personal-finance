'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { sessionManager } from '@/lib/session/session-manager'
import { createClient } from '@/lib/supabase/client'
import { createLoginUrlWithReturn } from '@/lib/utils/return-url'

/**
 * OfflineManager component for progressive enhancement and offline support
 * Handles offline scenarios and progressive enhancement
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
export function OfflineManager() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [hasJavaScript] = useState(true) // If this runs, JS is available
  const { session, validateSession } = useAuth()
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)
  const [offlineIndicatorVisible, setOfflineIndicatorVisible] = useState(false)

  /**
   * Cache authentication state for offline use
   * Requirements: 14.1, 14.2
   */
  const cacheAuthState = useCallback(() => {
    if (session && typeof window !== 'undefined') {
      try {
        const authCache = {
          user: session.user,
          expiresAt: session.expires_at,
          cachedAt: Date.now(),
          isValid: true
        }
        localStorage.setItem('cached-auth-state', JSON.stringify(authCache))
        console.log('Auth state cached for offline use')
      } catch (error) {
        console.warn('Failed to cache auth state:', error)
      }
    }
  }, [session])

  /**
   * Get cached authentication state for offline scenarios
   * Requirements: 14.1, 14.2
   */
  const getCachedAuthState = useCallback(() => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem('cached-auth-state')
      if (!cached) return null
      
      const authCache = JSON.parse(cached)
      const now = Date.now()
      const cacheAge = now - authCache.cachedAt
      const maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours
      
      // Check if cache is still valid
      if (cacheAge > maxCacheAge) {
        localStorage.removeItem('cached-auth-state')
        return null
      }
      
      // Check if session would have expired
      if (authCache.expiresAt && now > authCache.expiresAt * 1000) {
        localStorage.removeItem('cached-auth-state')
        return null
      }
      
      return authCache
    } catch (error) {
      console.warn('Failed to retrieve cached auth state:', error)
      localStorage.removeItem('cached-auth-state')
      return null
    }
  }, [])

  /**
   * Validate session after reconnecting
   * Requirements: 14.3, 14.4
   */
  const validateSessionAfterReconnect = useCallback(async () => {
    if (!session) return
    
    try {
      console.log('Validating session after reconnection...')
      const isValid = await validateSession()
      
      if (!isValid) {
        console.warn('Session expired while offline')
        handleSessionExpiry()
      } else {
        console.log('Session validated successfully after reconnection')
        // Update cached state with fresh session
        cacheAuthState()
      }
    } catch (error) {
      console.warn('Failed to validate session after reconnect:', error)
      // Try to use cached state as fallback
      const cachedState = getCachedAuthState()
      if (!cachedState) {
        handleSessionExpiry()
      }
    }
  }, [session, validateSession, cacheAuthState, getCachedAuthState])

  /**
   * Handle session expiry during offline scenarios
   * Requirements: 14.4, 14.5
   */
  const handleSessionExpiry = useCallback(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    const searchParams = typeof window !== 'undefined' ? window.location.search : ''
    
    // Clear cached auth state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached-auth-state')
    }
    
    // Clear session manager state
    sessionManager.clearSession()
    
    // Show user-friendly message
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('auth-session-expired', {
        detail: { 
          message: 'Your session has expired. Please log in again.',
          wasOffline: !isOnline
        }
      }))
    }
    
    // Only redirect if online, otherwise let user handle it when they come back online
    if (isOnline && typeof window !== 'undefined') {
      const loginUrl = createLoginUrlWithReturn(currentPath, searchParams, 'expired')
      window.location.href = loginUrl
    }
  }, [isOnline])

  /**
   * Handle online/offline state changes
   * Requirements: 14.1, 14.3, 14.4
   */
  const handleOnline = useCallback(() => {
    console.log('Network connection restored')
    setIsOnline(true)
    setLastOnlineTime(new Date())
    setOfflineIndicatorVisible(false)
    
    // Revalidate session when coming back online
    if (session) {
      validateSessionAfterReconnect()
    }
    
    // Dispatch custom event for other components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('network-restored', {
        detail: { timestamp: Date.now() }
      }))
    }
  }, [session, validateSessionAfterReconnect])

  const handleOffline = useCallback(() => {
    console.log('Network connection lost')
    setIsOnline(false)
    setOfflineIndicatorVisible(true)
    
    // Cache current auth state for offline use
    cacheAuthState()
    
    // Dispatch custom event for other components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('network-lost', {
        detail: { timestamp: Date.now() }
      }))
    }
  }, [cacheAuthState])

  /**
   * Check authentication service availability
   * Requirements: 14.3, 14.4
   */
  const checkAuthServiceAvailability = useCallback(async () => {
    if (!isOnline) return false
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.getSession()
      return !error
    } catch (error) {
      console.warn('Auth service unavailable:', error)
      return false
    }
  }, [isOnline])

  /**
   * Provide fallback for offline authentication scenarios
   * Requirements: 14.2, 14.3, 14.5
   */
  const getOfflineAuthFallback = useCallback(() => {
    if (isOnline) return null
    
    const cachedState = getCachedAuthState()
    if (cachedState) {
      return {
        isAuthenticated: true,
        user: cachedState.user,
        source: 'cache' as const,
        message: 'Using cached authentication (offline mode)'
      }
    }
    
    return {
      isAuthenticated: false,
      user: null,
      source: 'offline' as const,
      message: 'Authentication unavailable offline'
    }
  }, [isOnline, getCachedAuthState])

  /**
   * Set up online/offline event listeners
   * Requirements: 14.1, 14.3
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Set initial state
    setIsOnline(navigator.onLine)
    if (navigator.onLine) {
      setLastOnlineTime(new Date())
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  /**
   * Cache auth state when session changes
   * Requirements: 14.1, 14.2
   */
  useEffect(() => {
    if (session && isOnline) {
      cacheAuthState()
    }
  }, [session, isOnline, cacheAuthState])

  /**
   * Periodic connectivity check when offline
   * Requirements: 14.3, 14.4
   */
  useEffect(() => {
    if (isOnline) return
    
    const interval = setInterval(async () => {
      // Check if we're actually back online
      if (navigator.onLine && !isOnline) {
        handleOnline()
      }
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [isOnline, handleOnline])

  /**
   * Expose offline manager functionality globally
   * Requirements: 14.2, 14.3, 14.5
   */
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Expose offline manager methods globally for other components
    const offlineManager = {
      isOnline,
      getCachedAuthState,
      getOfflineAuthFallback,
      checkAuthServiceAvailability,
      lastOnlineTime
    }
    
    // @ts-ignore - Adding to window for global access
    window.offlineManager = offlineManager
    
    return () => {
      // @ts-ignore
      delete window.offlineManager
    }
  }, [isOnline, getCachedAuthState, getOfflineAuthFallback, checkAuthServiceAvailability, lastOnlineTime])

  /**
   * Show offline indicator when appropriate
   * Requirements: 14.5
   */
  if (!isOnline && offlineIndicatorVisible) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-amber-500/90 backdrop-blur-sm text-white text-center py-3 z-50 border-b border-amber-400/20">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            You're currently offline. Some features may be limited.
          </span>
          {lastOnlineTime && (
            <span className="text-xs opacity-75">
              Last online: {lastOnlineTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    )
  }

  // This component primarily manages offline state and doesn't render UI normally
  return null
}

/**
 * Hook to access offline manager functionality
 * Requirements: 14.1, 14.2, 14.3, 14.5
 */
export function useOfflineManager() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOnlineChange = () => setIsOnline(navigator.onLine)
    
    window.addEventListener('online', handleOnlineChange)
    window.addEventListener('offline', handleOnlineChange)
    
    return () => {
      window.removeEventListener('online', handleOnlineChange)
      window.removeEventListener('offline', handleOnlineChange)
    }
  }, [])
  
  return {
    isOnline,
    // @ts-ignore - Access global offline manager if available
    offlineManager: typeof window !== 'undefined' ? window.offlineManager : null
  }
}