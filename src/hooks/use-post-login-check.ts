'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getUserPendingInvitations, type PendingInvitation } from '@/lib/services/invitation-service'

interface PostLoginCheckResult {
  hasPendingInvitations: boolean
  pendingInvitations: PendingInvitation[]
  isLoading: boolean
  error: string | null
  checkComplete: boolean
}

/**
 * Hook that runs after successful login to check for pending invitations
 * This is the core mechanism that enables post-login invitation detection
 */
export function usePostLoginCheck(): PostLoginCheckResult {
  const { user, loading: authLoading } = useAuth()
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkComplete, setCheckComplete] = useState(false)

  useEffect(() => {
    // Only check when user is authenticated and auth is not loading
    if (!user || authLoading || !user.email || checkComplete) {
      return
    }

    console.log('usePostLoginCheck: Checking for pending invitations for user:', user.email)

    const checkForInvitations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await getUserPendingInvitations(user.email!)
        
        if (result.error) {
          console.error('Error checking for invitations:', result.error)
          setError(result.error)
          setPendingInvitations([])
        } else {
          console.log('Found pending invitations:', result.data)
          setPendingInvitations(result.data || [])
        }
      } catch (error) {
        console.error('Unexpected error checking for invitations:', error)
        setError('Failed to check for pending invitations')
        setPendingInvitations([])
      } finally {
        setIsLoading(false)
        setCheckComplete(true)
      }
    }

    checkForInvitations()
  }, [user, authLoading, checkComplete])

  // Reset check when user changes
  useEffect(() => {
    if (!user) {
      setCheckComplete(false)
      setPendingInvitations([])
      setError(null)
    }
  }, [user])

  return {
    hasPendingInvitations: pendingInvitations.length > 0,
    pendingInvitations,
    isLoading,
    error,
    checkComplete
  }
}