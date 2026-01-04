'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

/**
 * SessionExpiryHandler component for user-friendly session expiry notifications
 * Listens for session expiry events and shows appropriate toast notifications
 * Requirements: 13.2, 14.4
 */
export function SessionExpiryHandler() {
  const { warning, error } = useToast()

  useEffect(() => {
    /**
     * Handle session expiry events with user-friendly notifications
     * Requirements: 13.2, 14.4
     */
    const handleSessionExpiry = (event: CustomEvent) => {
      const { message, wasOffline } = event.detail || {}
      
      if (wasOffline) {
        // Session expired while offline - show warning
        warning(
          'Session Expired While Offline',
          'Your session expired while you were offline. Please log in again when you\'re ready to continue.'
        )
      } else {
        // Regular session expiry - show error
        error(
          'Session Expired',
          message || 'Your session has expired. Please log in again to continue.'
        )
      }
    }

    /**
     * Handle network restoration events
     * Requirements: 14.4
     */
    const handleNetworkRestored = () => {
      // Don't show toast for network restoration as it might be noisy
      // The OfflineManager already handles the visual indicator
      console.log('Network connection restored')
    }

    /**
     * Handle network loss events
     * Requirements: 14.4
     */
    const handleNetworkLost = () => {
      // Don't show toast for network loss as the OfflineManager shows a banner
      // This prevents duplicate notifications
      console.log('Network connection lost')
    }

    // Add event listeners for session expiry and network events
    window.addEventListener('auth-session-expired', handleSessionExpiry as EventListener)
    window.addEventListener('network-restored', handleNetworkRestored as EventListener)
    window.addEventListener('network-lost', handleNetworkLost as EventListener)

    return () => {
      // Clean up event listeners
      window.removeEventListener('auth-session-expired', handleSessionExpiry as EventListener)
      window.removeEventListener('network-restored', handleNetworkRestored as EventListener)
      window.removeEventListener('network-lost', handleNetworkLost as EventListener)
    }
  }, [warning, error])

  // This component only handles events and doesn't render any UI
  return null
}