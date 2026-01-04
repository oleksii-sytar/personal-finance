'use client'

import { useEffect, useState } from 'react'
import { getNetworkStatus, getNetworkStatusMessage } from '@/lib/utils/network-fallbacks'

interface NetworkStatusProps {
  showWhenOnline?: boolean
  className?: string
}

/**
 * NetworkStatus component for displaying connection status
 * Provides user feedback about network connectivity
 * Requirements: 14.5
 */
export function NetworkStatus({ showWhenOnline = false, className = '' }: NetworkStatusProps) {
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus())
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)

  useEffect(() => {
    const updateNetworkStatus = () => {
      const status = getNetworkStatus()
      setNetworkStatus(status)
      
      if (status.isOnline && !networkStatus.isOnline) {
        // Just came back online
        setLastOnlineTime(new Date())
      } else if (!status.isOnline && networkStatus.isOnline) {
        // Just went offline
        setLastOnlineTime(new Date())
      }
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [networkStatus.isOnline])

  // Don't show anything if online and showWhenOnline is false
  if (networkStatus.isOnline && !showWhenOnline) {
    return null
  }

  const statusMessage = getNetworkStatusMessage(networkStatus.isOnline, lastOnlineTime || undefined)
  const connectionDetails = networkStatus.effectiveType 
    ? `${networkStatus.effectiveType.toUpperCase()} connection`
    : 'Connection status'

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        networkStatus.isOnline 
          ? 'bg-green-500 animate-pulse' 
          : 'bg-red-500'
      }`} />
      <span className={networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
        {statusMessage}
      </span>
      {networkStatus.isOnline && networkStatus.effectiveType && (
        <span className="text-gray-500 text-xs">
          ({connectionDetails})
        </span>
      )}
    </div>
  )
}

/**
 * Hook for accessing network status
 * Requirements: 14.1, 14.5
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState(getNetworkStatus())

  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(getNetworkStatus())
    }

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  return networkStatus
}