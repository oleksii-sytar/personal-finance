/**
 * History Provider Component
 * 
 * Provides browser history management context to the application.
 * Handles proper back/forward button behavior and prevents authentication
 * redirects from breaking navigation history.
 * 
 * **Feature: auth-page-refresh-fix, Task 12.1: Browser History Handling**
 * **Validates: Requirements 12.3, 12.4**
 */

'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { historyManager, type HistoryState } from '@/lib/navigation/history-manager'

interface HistoryContextValue {
  canGoBack: boolean
  canGoForward: boolean
  previousUrl: string | null
  currentState: HistoryState | null
  isNavigating: boolean
  
  // Navigation methods
  goBack: (fallbackUrl?: string) => void
  goForward: () => void
  navigate: (url: string, options?: { replace?: boolean; state?: HistoryState }) => void
  
  // Return URL management
  setReturnUrl: (url: string) => void
  getReturnUrl: () => string | null
  clearReturnUrl: () => void
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

interface HistoryProviderProps {
  children: ReactNode
}

export function HistoryProvider({ children }: HistoryProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [previousUrl, setPreviousUrl] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<HistoryState | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // Initialize history manager
  useEffect(() => {
    historyManager.initialize()
    
    // Set initial state
    setCanGoBack(historyManager.canGoBack())
    setCanGoForward(historyManager.canGoForward())
    setPreviousUrl(historyManager.getPreviousUrl())
    setCurrentState(historyManager.getCurrentState())

    return () => {
      historyManager.destroy()
    }
  }, [])

  // Update state when pathname changes
  useEffect(() => {
    // Track the navigation
    historyManager.trackNavigation(window.location.href, historyManager.getCurrentState())
    
    // Update state
    setCanGoBack(historyManager.canGoBack())
    setCanGoForward(historyManager.canGoForward())
    setPreviousUrl(historyManager.getPreviousUrl())
    setCurrentState(historyManager.getCurrentState())
    setIsNavigating(false)
  }, [pathname])

  // Listen to history navigation events
  useEffect(() => {
    const handleHistoryNavigation = (event: CustomEvent) => {
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
  const goBack = (fallbackUrl: string = '/') => {
    setIsNavigating(true)
    historyManager.goBack(fallbackUrl)
  }

  const goForward = () => {
    setIsNavigating(true)
    historyManager.goForward()
  }

  const navigate = (url: string, options: { 
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
  }

  // Return URL management
  const setReturnUrl = (url: string) => {
    historyManager.setReturnUrl(url)
    setCurrentState(historyManager.getCurrentState())
  }

  const getReturnUrl = () => {
    return historyManager.getReturnUrl()
  }

  const clearReturnUrl = () => {
    historyManager.clearReturnUrl()
    setCurrentState(historyManager.getCurrentState())
  }

  const contextValue: HistoryContextValue = {
    canGoBack,
    canGoForward,
    previousUrl,
    currentState,
    isNavigating,
    
    // Navigation methods
    goBack,
    goForward,
    navigate,
    
    // Return URL management
    setReturnUrl,
    getReturnUrl,
    clearReturnUrl,
  }

  return (
    <HistoryContext.Provider value={contextValue}>
      {children}
    </HistoryContext.Provider>
  )
}

/**
 * Hook to use history context
 */
export function useHistory(): HistoryContextValue {
  const context = useContext(HistoryContext)
  
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider')
  }
  
  return context
}

/**
 * Hook for authentication-aware navigation
 */
export function useAuthAwareHistory() {
  const history = useHistory()
  const pathname = usePathname()

  const navigateWithAuth = (url: string, options: {
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
  }

  const goBackSafely = (fallbackUrl: string = '/dashboard') => {
    // Check if we can go back safely (not to auth pages)
    const previousUrl = history.previousUrl
    
    if (previousUrl && !previousUrl.includes('/auth/')) {
      history.goBack(fallbackUrl)
    } else {
      history.navigate(fallbackUrl, { replace: true })
    }
  }

  return {
    ...history,
    navigateWithAuth,
    goBackSafely,
  }
}