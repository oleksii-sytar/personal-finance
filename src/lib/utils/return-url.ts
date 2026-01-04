/**
 * Return URL utility functions for authentication flows
 * Handles URL capture, validation, and restoration
 * Requirements: 7.3, 8.3, 12.1, 12.2
 */

const VALID_RETURN_URL_PATTERNS = [
  /^\/dashboard/,
  /^\/transactions/,
  /^\/categories/,
  /^\/accounts/,
  /^\/reports/,
  /^\/settings/,
  /^\/onboarding/,
]

const INVALID_RETURN_URL_PATTERNS = [
  /^\/auth/,
  /^\/api/,
  /^\/status/,
  /^\/$/,
]

const MAX_RETURN_URL_AGE = 60 * 60 * 1000 // 1 hour in milliseconds

interface ReturnUrlData {
  url: string
  timestamp: number
  source: 'middleware' | 'client' | 'manual'
}

/**
 * Validates if a URL is safe to use as a return URL
 */
export function isValidReturnUrl(url: string): boolean {
  try {
    // Basic validation
    if (!url || typeof url !== 'string') {
      return false
    }

    // Remove leading/trailing whitespace
    url = url.trim()

    // Must start with /
    if (!url.startsWith('/')) {
      return false
    }

    // Check against invalid patterns first
    if (INVALID_RETURN_URL_PATTERNS.some(pattern => pattern.test(url))) {
      return false
    }

    // Check against valid patterns
    if (!VALID_RETURN_URL_PATTERNS.some(pattern => pattern.test(url))) {
      return false
    }

    // Additional security checks
    if (url.includes('..') || url.includes('//')) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Captures the current URL for later restoration
 */
export function captureReturnUrl(
  pathname: string, 
  searchParams?: string,
  source: 'middleware' | 'client' | 'manual' = 'client'
): string | null {
  const fullUrl = pathname + (searchParams ? `?${searchParams}` : '')
  
  if (!isValidReturnUrl(fullUrl)) {
    return null
  }

  const returnUrlData: ReturnUrlData = {
    url: fullUrl,
    timestamp: Date.now(),
    source
  }

  // Store in sessionStorage for client-side access
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('return_url_data', JSON.stringify(returnUrlData))
    } catch {
      // Ignore storage errors
    }
  }

  return encodeURIComponent(fullUrl)
}

/**
 * Retrieves and validates a stored return URL
 */
export function getStoredReturnUrl(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const stored = sessionStorage.getItem('return_url_data')
    if (!stored) {
      return null
    }

    const data: ReturnUrlData = JSON.parse(stored)
    
    // Check if URL has expired
    if (Date.now() - data.timestamp > MAX_RETURN_URL_AGE) {
      sessionStorage.removeItem('return_url_data')
      return null
    }

    // Validate URL is still safe
    if (!isValidReturnUrl(data.url)) {
      sessionStorage.removeItem('return_url_data')
      return null
    }

    return data.url
  } catch {
    // Clear invalid data
    sessionStorage.removeItem('return_url_data')
    return null
  }
}

/**
 * Clears stored return URL data
 */
export function clearReturnUrl(): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('return_url_data')
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Extracts return URL from search parameters with validation
 */
export function extractReturnUrl(searchParams: URLSearchParams): string | null {
  const returnUrl = searchParams.get('returnUrl')
  
  if (!returnUrl) {
    return null
  }

  try {
    const decodedUrl = decodeURIComponent(returnUrl)
    return isValidReturnUrl(decodedUrl) ? decodedUrl : null
  } catch {
    return null
  }
}

/**
 * Creates a login URL with return URL parameter
 */
export function createLoginUrlWithReturn(
  currentPath: string,
  searchParams?: string,
  reason?: 'expired' | 'required' | 'invalid'
): string {
  const returnUrl = captureReturnUrl(currentPath, searchParams, 'client')
  const loginUrl = new URL('/auth/login', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  
  if (returnUrl) {
    loginUrl.searchParams.set('returnUrl', returnUrl)
  }
  
  if (reason) {
    loginUrl.searchParams.set('reason', reason)
  }
  
  return loginUrl.toString()
}

/**
 * Determines the best destination after successful authentication
 */
export function determinePostAuthDestination(
  searchParams: URLSearchParams,
  userContext?: {
    hasWorkspace: boolean
    hasPendingInvitations: boolean
    isFirstTime: boolean
  }
): string {
  // First priority: valid return URL
  const returnUrl = extractReturnUrl(searchParams)
  if (returnUrl) {
    clearReturnUrl() // Clear after use
    return returnUrl
  }

  // Second priority: stored return URL
  const storedUrl = getStoredReturnUrl()
  if (storedUrl) {
    clearReturnUrl() // Clear after use
    return storedUrl
  }

  // Third priority: user context-based routing
  if (userContext) {
    if (userContext.hasPendingInvitations) {
      return '/auth/accept-invitations'
    }
    
    if (!userContext.hasWorkspace) {
      return '/dashboard'
    }
    
    if (userContext.isFirstTime) {
      return '/onboarding/welcome'
    }
  }

  // Default: dashboard
  return '/dashboard'
}

/**
 * Handles return URL restoration with fallback logic
 */
export function handleReturnUrlRestoration(
  searchParams: URLSearchParams,
  fallbackUrl: string = '/dashboard'
): string {
  const returnUrl = extractReturnUrl(searchParams)
  
  if (returnUrl) {
    clearReturnUrl()
    return returnUrl
  }

  const storedUrl = getStoredReturnUrl()
  if (storedUrl) {
    clearReturnUrl()
    return storedUrl
  }

  return fallbackUrl
}