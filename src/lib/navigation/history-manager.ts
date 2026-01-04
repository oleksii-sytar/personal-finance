/**
 * Browser History Manager
 * 
 * Manages browser history state to ensure proper back/forward button behavior
 * and prevent authentication redirects from breaking navigation history.
 * 
 * **Feature: auth-page-refresh-fix, Task 12.1: Browser History Handling**
 * **Validates: Requirements 12.3, 12.4**
 */

interface HistoryState {
  returnUrl?: string
  authFlow?: 'login' | 'register' | 'reset-password' | 'verify-email'
  preserveHistory?: boolean
  timestamp?: number
}

interface NavigationEntry {
  url: string
  state: HistoryState | null
  timestamp: number
}

class BrowserHistoryManager {
  private navigationStack: NavigationEntry[] = []
  private maxStackSize = 50
  private isInitialized = false

  /**
   * Initialize the history manager
   */
  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return

    // Listen to popstate events (back/forward buttons)
    window.addEventListener('popstate', this.handlePopState.bind(this))
    
    // Track initial page load
    this.trackNavigation(window.location.href, window.history.state)
    
    this.isInitialized = true
  }

  /**
   * Handle browser back/forward button events
   */
  private handlePopState(event: PopStateEvent): void {
    const state = event.state as HistoryState | null
    const currentUrl = window.location.href

    // Update our navigation stack
    this.trackNavigation(currentUrl, state)

    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('historyNavigation', {
      detail: {
        url: currentUrl,
        state,
        direction: this.getNavigationDirection(currentUrl)
      }
    }))
  }

  /**
   * Track a navigation event
   */
  trackNavigation(url: string, state: HistoryState | null = null): void {
    const entry: NavigationEntry = {
      url,
      state,
      timestamp: Date.now()
    }

    // Add to stack
    this.navigationStack.push(entry)

    // Limit stack size
    if (this.navigationStack.length > this.maxStackSize) {
      this.navigationStack.shift()
    }
  }

  /**
   * Navigate with proper history state management
   */
  navigate(url: string, options: {
    replace?: boolean
    state?: HistoryState
    preserveHistory?: boolean
  } = {}): void {
    if (typeof window === 'undefined') return

    const { replace = false, state = {}, preserveHistory = true } = options

    // Prepare history state
    const historyState: HistoryState = {
      ...state,
      preserveHistory,
      timestamp: Date.now()
    }

    try {
      if (replace) {
        window.history.replaceState(historyState, '', url)
      } else {
        window.history.pushState(historyState, '', url)
      }

      // Track the navigation
      this.trackNavigation(url, historyState)
    } catch (error) {
      console.warn('History navigation failed:', error)
      // Fallback to location change
      window.location.href = url
    }
  }

  /**
   * Navigate back with authentication awareness
   */
  goBack(fallbackUrl: string = '/'): void {
    if (typeof window === 'undefined') return

    // Check if we can go back safely
    if (this.canGoBack()) {
      window.history.back()
    } else {
      // Navigate to fallback URL
      this.navigate(fallbackUrl, { replace: true })
    }
  }

  /**
   * Navigate forward if possible
   */
  goForward(): void {
    if (typeof window === 'undefined') return

    if (this.canGoForward()) {
      window.history.forward()
    }
  }

  /**
   * Check if we can safely go back
   */
  canGoBack(): boolean {
    if (typeof window === 'undefined') return false

    // Check if there's history to go back to
    const hasHistory = this.navigationStack.length > 1
    
    // Check if the previous entry is safe to navigate to
    if (hasHistory) {
      const previousEntry = this.navigationStack[this.navigationStack.length - 2]
      return !this.isAuthenticationUrl(previousEntry.url)
    }

    return false
  }

  /**
   * Check if we can go forward
   */
  canGoForward(): boolean {
    if (typeof window === 'undefined') return false
    
    // This is harder to determine without browser API access
    // We'll rely on the browser's built-in behavior
    return true
  }

  /**
   * Get the previous URL in history
   */
  getPreviousUrl(): string | null {
    if (this.navigationStack.length < 2) return null
    return this.navigationStack[this.navigationStack.length - 2].url
  }

  /**
   * Get the current history state
   */
  getCurrentState(): HistoryState | null {
    if (typeof window === 'undefined') return null
    return window.history.state as HistoryState | null
  }

  /**
   * Set return URL for authentication flows
   */
  setReturnUrl(url: string): void {
    if (typeof window === 'undefined') return

    const currentState = this.getCurrentState() || {}
    const newState: HistoryState = {
      ...currentState,
      returnUrl: url,
      timestamp: Date.now()
    }

    window.history.replaceState(newState, '', window.location.href)
  }

  /**
   * Get return URL from history state
   */
  getReturnUrl(): string | null {
    const state = this.getCurrentState()
    return state?.returnUrl || null
  }

  /**
   * Clear return URL from history state
   */
  clearReturnUrl(): void {
    if (typeof window === 'undefined') return

    const currentState = this.getCurrentState() || {}
    const { returnUrl, ...newState } = currentState
    
    window.history.replaceState(newState, '', window.location.href)
  }

  /**
   * Check if a URL is an authentication URL
   */
  private isAuthenticationUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname.startsWith('/auth/')
    } catch {
      return false
    }
  }

  /**
   * Determine navigation direction based on URL
   */
  private getNavigationDirection(currentUrl: string): 'back' | 'forward' | 'unknown' {
    if (this.navigationStack.length < 2) return 'unknown'

    const previousEntry = this.navigationStack[this.navigationStack.length - 2]
    
    if (previousEntry.url === currentUrl) {
      return 'back'
    }

    // Check if this URL appears later in history (forward navigation)
    const futureIndex = this.navigationStack.findIndex((entry, index) => 
      index > this.navigationStack.length - 1 && entry.url === currentUrl
    )

    return futureIndex !== -1 ? 'forward' : 'unknown'
  }

  /**
   * Clean up old history entries
   */
  cleanup(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    this.navigationStack = this.navigationStack.filter(
      entry => entry.timestamp > cutoffTime
    )
  }

  /**
   * Get navigation history for debugging
   */
  getNavigationHistory(): NavigationEntry[] {
    return [...this.navigationStack]
  }

  /**
   * Reset the history manager
   */
  reset(): void {
    this.navigationStack = []
    if (typeof window !== 'undefined') {
      this.trackNavigation(window.location.href, window.history.state)
    }
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.handlePopState.bind(this))
    }
    this.isInitialized = false
  }
}

// Create singleton instance
export const historyManager = new BrowserHistoryManager()

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  historyManager.initialize()
}

// Types for external use
export type { HistoryState, NavigationEntry }