'use client'

import { useEffect, useState, useCallback } from 'react'
import { checkAuthServiceAvailability, getAuthFallback } from '@/lib/utils/network-fallbacks'
import type { ServiceAvailabilityResult, FallbackAuthState } from '@/lib/utils/network-fallbacks'

interface ServiceStatusProps {
  onServiceStatusChange?: (isAvailable: boolean) => void
  checkInterval?: number
  showDetails?: boolean
  className?: string
}

/**
 * ServiceStatus component for monitoring authentication service availability
 * Provides fallbacks when services are unavailable
 * Requirements: 14.3, 14.4, 14.5
 */
export function ServiceStatus({ 
  onServiceStatusChange,
  checkInterval = 30000, // 30 seconds
  showDetails = false,
  className = ''
}: ServiceStatusProps) {
  const [serviceStatus, setServiceStatus] = useState<ServiceAvailabilityResult | null>(null)
  const [authFallback, setAuthFallback] = useState<FallbackAuthState | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkService = useCallback(async () => {
    if (isChecking) return
    
    setIsChecking(true)
    try {
      const status = await checkAuthServiceAvailability({
        maxRetries: 1,
        timeoutMs: 5000
      })
      
      setServiceStatus(status)
      
      // Get fallback auth state if service is unavailable
      if (!status.isAvailable) {
        const fallback = await getAuthFallback({
          fallbackMessage: 'Authentication service temporarily unavailable'
        })
        setAuthFallback(fallback)
      } else {
        setAuthFallback(null)
      }
      
      // Notify parent component of status change
      if (onServiceStatusChange) {
        onServiceStatusChange(status.isAvailable)
      }
    } catch (error) {
      console.warn('Failed to check service status:', error)
      setServiceStatus({
        isAvailable: false,
        error: 'Failed to check service status'
      })
    } finally {
      setIsChecking(false)
    }
  }, [isChecking, onServiceStatusChange])

  useEffect(() => {
    // Initial check
    checkService()
    
    // Set up periodic checks
    const interval = setInterval(checkService, checkInterval)
    
    return () => clearInterval(interval)
  }, [checkService, checkInterval])

  // Listen for network changes to recheck service
  useEffect(() => {
    const handleOnline = () => {
      setTimeout(checkService, 1000) // Wait a bit for connection to stabilize
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [checkService])

  if (!serviceStatus) {
    return (
      <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span>Checking service status...</span>
      </div>
    )
  }

  if (serviceStatus.isAvailable) {
    if (!showDetails) return null
    
    return (
      <div className={`flex items-center space-x-2 text-sm text-green-600 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span>All services operational</span>
        {serviceStatus.responseTime && (
          <span className="text-xs text-gray-500">
            ({Math.round(serviceStatus.responseTime)}ms)
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2 text-sm text-amber-600">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span>Service temporarily unavailable</span>
        {isChecking && (
          <span className="text-xs text-gray-500">Retrying...</span>
        )}
      </div>
      
      {authFallback && (
        <div className="text-xs text-gray-600 bg-amber-50 p-2 rounded border border-amber-200">
          <div className="font-medium">Fallback Mode Active</div>
          <div>{authFallback.message}</div>
          {authFallback.source === 'cache' && authFallback.lastUpdated && (
            <div className="text-gray-500 mt-1">
              Last updated: {authFallback.lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
      
      {showDetails && serviceStatus.error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          Error: {serviceStatus.error}
        </div>
      )}
    </div>
  )
}

/**
 * Hook for monitoring service availability
 * Requirements: 14.3, 14.4
 */
export function useServiceStatus(checkInterval: number = 30000) {
  const [serviceStatus, setServiceStatus] = useState<ServiceAvailabilityResult | null>(null)
  const [authFallback, setAuthFallback] = useState<FallbackAuthState | null>(null)

  const checkService = useCallback(async () => {
    try {
      const status = await checkAuthServiceAvailability({
        maxRetries: 1,
        timeoutMs: 5000
      })
      
      setServiceStatus(status)
      
      if (!status.isAvailable) {
        const fallback = await getAuthFallback()
        setAuthFallback(fallback)
      } else {
        setAuthFallback(null)
      }
    } catch (error) {
      setServiceStatus({
        isAvailable: false,
        error: 'Failed to check service status'
      })
    }
  }, [])

  useEffect(() => {
    checkService()
    const interval = setInterval(checkService, checkInterval)
    return () => clearInterval(interval)
  }, [checkService, checkInterval])

  return {
    serviceStatus,
    authFallback,
    recheckService: checkService
  }
}