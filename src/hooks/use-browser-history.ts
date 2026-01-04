/**
 * Browser History Hook
 * 
 * React hook for managing browser history with authentication awareness.
 * Provides safe navigation methods that respect authentication flows.
 * 
 * **Feature: auth-page-refresh-fix, Task 12.1: Browser History Handling**
 * **Validates: Requirements 12.3, 12.4**
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { historyManager, type HistoryState } from '@/lib/navigation/history-manager'

interface HistoryNavigationEvent {
  url: string
  state: HistoryState | null
  direction: 'back' | 'forward' | 'unknown'
}

interface UseBrowserHistoryReturn {
  // Navigation methods
  goBack: (fallbackUrl?: string) => void
  goForward: () => void
  navigate: (url: string, options?: { replace?: boolean; state?: HistoryState }) => void
  
  // History state management
  setReturnUrl: (url: string) => void
  getReturnUrl: () => string | null
  clearReturnUrl: () => void
  
  // History information
  canGoBack: boolean
  canGoForward: boolean
  previousUrl: string | null
  currentState: HistoryState | null
  
  // Navigation events
  isNavigating: boolean
  lastNavigation: HistoryNavigationEvent | null
}

export function useBrowserHistory(): UseBrowserHistoryReturn {
  const router = useRouter()
  const pathname = usePathname()
  
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [previousUrl, setPreviousUrl] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<HistoryState | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [lastNavigation, setLastNavigation] = useState<HistoryNavigationEvent | null>(null)

  // Update state when pathname changes
  useEffect(() => {
    setCanGoBack(historyManager.canGoBack())
    setCanGoForward(historyManager.canGoForward())
    setPreviousUrl(historyManager.getPreviousUrl())
    setCurrentState(historyManager.getCurrentState())
  }, [pathname])

  // Listen to history navigation events
  useEffect(() => {
    const handleHistoryNavigation = (event: CustomEvent<HistoryNavigationEvent>) => {
      setLastNavigation(event.detail)
      setIsNavigating(false)
      
      // Update state
      setCanGoBack(historyManager.canGoBack())
      setCanGoForward(historyManager.canGoForward())
      setPreviousUrl(historyManager.getPreviousUrl())
      setCurrentState(historyManager.getCurrentState())
    }

    window.addEventListener('historyNavigation', handleHistoryNavigation as EventListener)
    
    return () => {
      window.removeEventListener('historyNavigation', handleHistoryNavigation as EventListener)
    }
  }, [])

  // Navigation methods
  const goBack = useCallback((fallbackUrl: string = '/') => {
    setIsNavigating(true)
    historyManager.goBack(fallbackUrl)
  }, [])

  const goForward = useCallback(() => {
    setIsNavigating(true)
    historyManager.goForward()
  }, [])

  const navigate = useCallback((url: string, options: { 
    replace?: boolean
    state?: HistoryState 
  } = {}) => {
    setIsNavigating(true)
    
    // Use Next.js router for client-side navigation
    if (options.replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
    
    // Also update history manager state
    historyManager.navigate(url, options)
  }, [router])

  // Return URL management
  const setReturnUrl = useCallback((url: string) => {
    historyManager.setReturnUrl(url)
    setCurrentState(historyManager.getCurrentState())
  }, [])

  const getReturnUrl = useCallback(() => {
    return historyManager.getReturnUrl()
  }, [])

  const clearReturnUrl = useCallback(() => {
    historyManager.clearReturnUrl()
    setCurrentState(historyManager.getCurrentState())
  }, [])

  return {
    // Navigation methods
    goBack,
    goForward,
    navigate,
    
    // History state management
    setReturnUrl,
    getReturnUrl,
    clearReturnUrl,
    
    // History information
    canGoBack,
    canGoForward,
    previousUrl,
    currentState,
    
    // Navigation events
    isNavigating,
    lastNavigation,
  }
}

/**
 * Hook for handling authentication-aware navigation
 */
export function useAuthAwareNavigation() {
  const history = useBrowserHistory()
  const pathname = usePathname()

  const navigateWithAuth = useCallback((url: string, options: {
    requireAuth?: boolean
    preserveReturnUrl?: boolean
    replace?: boolean
  } = {}) => {
    const { requireAuth = false, preserveReturnUrl = true, replace = false } = options

    // If navigation requires auth and we need to preserve return URL
    if (requireAuth && preserveReturnUrl) {
      history.setReturnUrl(pathname)
    }

    history.navigate(url, { replace })
  }, [history, pathname])

  const goBackSafely = useCallback((fallbackUrl: string = '/dashboard') => {
    // Check if we can go back safely (not to auth pages)
    const previousUrl = history.previousUrl
    
    if (previousUrl && !previousUrl.includes('/auth/')) {
      history.goBack(fallbackUrl)
    } else {
      history.navigate(fallbackUrl, { replace: true })
    }
  }, [history])

  return {
    ...history,
    navigateWithAuth,
    goBackSafely,
  }
}