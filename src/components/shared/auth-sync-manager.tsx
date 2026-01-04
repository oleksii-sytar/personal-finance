'use client'

import { useEffect, useCallback, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { sessionManager } from '@/lib/session/session-manager'
import { createLoginUrlWithReturn } from '@/lib/utils/return-url'

/**
 * AuthSyncManager component for cross-tab authentication synchronization
 * Manages authentication state synchronization across browser tabs
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function AuthSyncManager() {
  const { user, session, signOut, validateSession } = useAuth()
  const [isVisible, setIsVisible] = useState(true)

  /**
   * Broadcast authentication changes to other tabs
   * Requirements: 13.1, 13.2, 13.3
   */
  const broadcastAuthChange = useCallback((type: string, data?: any) => {
    const message = JSON.stringify({ 
      type, 
      data, 
      timestamp: Date.now(),
      tabId: Math.random().toString(36).substr(2, 9) // Unique tab identifier
    })
    
    localStorage.setItem('auth-state-change', message)
    // Remove immediately to trigger event in other tabs
    localStorage.removeItem('auth-state-change')
  }, [])

  /**
   * Handle session expiry gracefully with user feedback
   * Requirements: 13.2, 14.4
   */
  const handleSessionExpiry = useCallback(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    const searchParams = typeof window !== 'undefined' ? window.location.search : ''
    
    // Broadcast session expiry to other tabs
    broadcastAuthChange('SESSION_EXPIRED', { path: currentPath })
    
    // Clear local session state
    sessionManager.clearSession()
    
    // Show user-friendly message (if toast system is available)
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('auth-session-expired', {
        detail: { message: 'Your session has expired. Please log in again.' }
      }))
    }
    
    // Redirect to login with return URL using the new system
    if (typeof window !== 'undefined') {
      const loginUrl = createLoginUrlWithReturn(currentPath, searchParams, 'expired')
      window.location.href = loginUrl
    }
  }, [broadcastAuthChange])

  /**
   * Validate session when tab becomes visible
   * Requirements: 13.2, 14.4
   */
  const validateSessionOnFocus = useCallback(async () => {
    if (!session) return
    
    try {
      const isValid = await validateSession()
      if (!isValid) {
        handleSessionExpiry()
      }
    } catch (error) {
      console.error('Session validation failed:', error)
      handleSessionExpiry()
    }
  }, [session, validateSession, handleSessionExpiry])

  /**
   * Listen for auth changes in other tabs
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-state-change' && e.newValue) {
        try {
          const change = JSON.parse(e.newValue)
          
          // Ignore messages from the same tab
          if (change.tabId === sessionStorage.getItem('current-tab-id')) {
            return
          }
          
          switch (change.type) {
            case 'SIGN_OUT':
              // User signed out in another tab
              console.log('Sign out detected in another tab')
              signOut()
              break
              
            case 'SIGN_IN':
              // User signed in in another tab - refresh current tab
              console.log('Sign in detected in another tab')
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
              break
              
            case 'SESSION_EXPIRED':
              // Session expired - handle gracefully
              console.log('Session expiry detected in another tab')
              handleSessionExpiry()
              break
              
            case 'WORKSPACE_CHANGED':
              // Workspace changed in another tab
              console.log('Workspace change detected in another tab')
              if (typeof window !== 'undefined') {
                window.location.reload()
              }
              break
              
            default:
              console.log('Unknown auth state change:', change.type)
          }
        } catch (error) {
          console.error('Failed to parse auth state change:', error)
        }
      }
    }
    
    // Set unique tab identifier
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current-tab-id', Math.random().toString(36).substr(2, 9))
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [signOut, handleSessionExpiry])

  /**
   * Handle page visibility changes
   * Requirements: 13.4, 13.5
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsVisible(visible)
      
      // Revalidate session when tab becomes visible
      if (visible && session) {
        validateSessionOnFocus()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session, validateSessionOnFocus])

  /**
   * Broadcast auth changes when user state changes
   * Requirements: 13.1, 13.2, 13.3
   */
  useEffect(() => {
    if (user) {
      // User signed in
      broadcastAuthChange('SIGN_IN', { userId: user.id })
    } else if (!user && session === null) {
      // User signed out (only if session is explicitly null, not during loading)
      broadcastAuthChange('SIGN_OUT')
    }
  }, [user, session, broadcastAuthChange])

  /**
   * Handle beforeunload to clean up
   * Requirements: 13.5
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clean up tab-specific data
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('current-tab-id')
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  /**
   * Periodic session validation
   * Requirements: 13.2, 14.4
   */
  useEffect(() => {
    if (!session) return
    
    // Validate session every 5 minutes when tab is visible
    const interval = setInterval(() => {
      if (isVisible && session) {
        validateSessionOnFocus()
      }
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [session, isVisible, validateSessionOnFocus])

  // This component only manages cross-tab synchronization logic
  // It doesn't render any UI
  return null
}