/**
 * Network fallback utilities for graceful degradation
 * Handles authentication service unavailability and network issues
 * Requirements: 14.3, 14.4, 14.5
 */

import { createClient } from '@/lib/supabase/client'

export interface NetworkFallbackOptions {
  maxRetries?: number
  retryDelay?: number
  timeoutMs?: number
  fallbackMessage?: string
}

export interface ServiceAvailabilityResult {
  isAvailable: boolean
  error?: string
  responseTime?: number
}

export interface FallbackAuthState {
  isAuthenticated: boolean
  user: any | null
  source: 'live' | 'cache' | 'offline'
  message: string
  lastUpdated?: Date
}

/**
 * Check if authentication service is available
 * Requirements: 14.3, 14.4
 */
export async function checkAuthServiceAvailability(
  options: NetworkFallbackOptions = {}
): Promise<ServiceAvailabilityResult> {
  const { timeoutMs = 5000, maxRetries = 2, retryDelay = 1000 } = options
  
  let lastError: string | undefined
  let totalResponseTime = 0
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const startTime = Date.now()
    
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      
      const supabase = createClient()
      const { error } = await supabase.auth.getSession()
      
      clearTimeout(timeout)
      const responseTime = Date.now() - startTime
      totalResponseTime += responseTime
      
      if (!error) {
        return {
          isAvailable: true,
          responseTime: totalResponseTime / (attempt + 1)
        }
      }
      
      lastError = error.message
    } catch (error) {
      const responseTime = Date.now() - startTime
      totalResponseTime += responseTime
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = 'Service timeout'
        } else if (error.message.includes('fetch')) {
          lastError = 'Network connection failed'
        } else {
          lastError = error.message
        }
      } else {
        lastError = 'Unknown service error'
      }
    }
    
    // Wait before retry (except on last attempt)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
  
  return {
    isAvailable: false,
    error: lastError,
    responseTime: totalResponseTime / maxRetries
  }
}

/**
 * Get cached authentication state for offline scenarios
 * Requirements: 14.1, 14.2, 14.5
 */
export function getCachedAuthState(): FallbackAuthState | null {
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
    
    return {
      isAuthenticated: true,
      user: authCache.user,
      source: 'cache',
      message: 'Using cached authentication (offline mode)',
      lastUpdated: new Date(authCache.cachedAt)
    }
  } catch (error) {
    console.warn('Failed to retrieve cached auth state:', error)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cached-auth-state')
    }
    return null
  }
}

/**
 * Provide authentication fallback for offline scenarios
 * Requirements: 14.2, 14.3, 14.5
 */
export async function getAuthFallback(
  options: NetworkFallbackOptions = {}
): Promise<FallbackAuthState> {
  const { fallbackMessage = 'Authentication service temporarily unavailable' } = options
  
  // First, try to check service availability
  const serviceCheck = await checkAuthServiceAvailability(options)
  
  if (serviceCheck.isAvailable) {
    // Service is available, try to get live auth state
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!error && session) {
        return {
          isAuthenticated: true,
          user: session.user,
          source: 'live',
          message: 'Authentication service available',
          lastUpdated: new Date()
        }
      }
    } catch (error) {
      console.warn('Failed to get live auth state despite service being available:', error)
    }
  }
  
  // Service unavailable or failed, try cached state
  const cachedState = getCachedAuthState()
  if (cachedState) {
    return {
      ...cachedState,
      message: `${fallbackMessage}. Using cached authentication.`
    }
  }
  
  // No cached state available
  return {
    isAuthenticated: false,
    user: null,
    source: 'offline',
    message: `${fallbackMessage}. Please try again when connection is restored.`,
    lastUpdated: new Date()
  }
}

/**
 * Handle network errors with appropriate fallbacks
 * Requirements: 14.3, 14.4, 14.5
 */
export function handleNetworkError(error: unknown, context: string = 'operation'): {
  message: string
  shouldRetry: boolean
  fallbackAction?: string
} {
  let message = `Network error during ${context}`
  let shouldRetry = true
  let fallbackAction: string | undefined
  
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      message = `Request timeout during ${context}. Please check your connection.`
      shouldRetry = true
      fallbackAction = 'retry_with_longer_timeout'
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      message = `Network connection failed during ${context}. Please check your internet connection.`
      shouldRetry = true
      fallbackAction = 'check_connection'
    } else if (error.message.includes('503') || error.message.includes('502')) {
      message = `Service temporarily unavailable during ${context}. Please try again in a few moments.`
      shouldRetry = true
      fallbackAction = 'retry_later'
    } else if (error.message.includes('429')) {
      message = `Too many requests during ${context}. Please wait before trying again.`
      shouldRetry = false
      fallbackAction = 'wait_and_retry'
    } else {
      message = `Connection error during ${context}. Please try again.`
      shouldRetry = true
    }
  }
  
  return { message, shouldRetry, fallbackAction }
}

/**
 * Retry operation with exponential backoff
 * Requirements: 14.3, 14.4
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options
  
  let lastError: unknown
  let delay = initialDelay
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on the last attempt
      if (attempt === maxRetries - 1) {
        break
      }
      
      // Don't retry certain types of errors
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          // Authentication/authorization errors shouldn't be retried
          break
        }
        if (error.message.includes('400') || error.message.includes('422')) {
          // Client errors shouldn't be retried
          break
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }
  
  throw lastError
}

/**
 * Check if user is in offline mode
 * Requirements: 14.1, 14.5
 */
export function isOfflineMode(): boolean {
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}

/**
 * Get network status with additional context
 * Requirements: 14.1, 14.5
 */
export function getNetworkStatus(): {
  isOnline: boolean
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
} {
  if (typeof navigator === 'undefined') {
    return { isOnline: true }
  }
  
  const status = {
    isOnline: navigator.onLine
  }
  
  // Add connection information if available (modern browsers)
  // @ts-ignore - NetworkInformation is not in all TypeScript definitions
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (connection) {
    return {
      ...status,
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }
  
  return status
}

/**
 * Show user-friendly network status message
 * Requirements: 14.5
 */
export function getNetworkStatusMessage(isOnline: boolean, lastOnlineTime?: Date): string {
  if (isOnline) {
    return 'Connected'
  }
  
  if (lastOnlineTime) {
    const timeSinceOffline = Date.now() - lastOnlineTime.getTime()
    const minutes = Math.floor(timeSinceOffline / 60000)
    
    if (minutes < 1) {
      return 'Just went offline'
    } else if (minutes < 60) {
      return `Offline for ${minutes} minute${minutes === 1 ? '' : 's'}`
    } else {
      const hours = Math.floor(minutes / 60)
      return `Offline for ${hours} hour${hours === 1 ? '' : 's'}`
    }
  }
  
  return 'Currently offline'
}

/**
 * Cache current authentication state for offline use
 * Requirements: 14.1, 14.2
 */
export function cacheCurrentAuthState(user: any, session: any): boolean {
  if (typeof window === 'undefined' || !session) return false
  
  try {
    const authCache = {
      user,
      expiresAt: session.expires_at,
      cachedAt: Date.now(),
      isValid: true
    }
    localStorage.setItem('cached-auth-state', JSON.stringify(authCache))
    return true
  } catch (error) {
    console.warn('Failed to cache auth state:', error)
    return false
  }
}

/**
 * Clear cached authentication state
 * Requirements: 14.1, 14.2
 */
export function clearCachedAuthState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cached-auth-state')
  }
}