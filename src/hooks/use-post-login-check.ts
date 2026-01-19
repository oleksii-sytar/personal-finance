'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getUserPendingInvitations, type PendingInvitation } from '@/lib/services/invitation-service'

// Global cache to prevent multiple instances from making the same API call
const invitationCache = new Map<string, {
  data: PendingInvitation[]
  timestamp: number
  promise?: Promise<any>
}>()

const CACHE_DURATION = 30000 // 30 seconds

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
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTimeRef = useRef<number>(0)

  useEffect(() => {
    // Only check when user is authenticated and auth is not loading
    if (!user || authLoading || !user.email) {
      return
    }

    // Prevent duplicate checks for the same user email
    if (checkComplete && lastCheckedEmail === user.email) {
      return
    }

    // Prevent rapid successive calls (debounce with 1 second)
    if (isLoading) {
      return
    }

    // Prevent calls within 2 seconds of the last check
    const now = Date.now()
    if (now - lastCheckTimeRef.current < 2000) {
      return
    }

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Debounce the check to prevent rapid calls
    debounceTimeoutRef.current = setTimeout(() => {
      lastCheckTimeRef.current = Date.now()

      const checkForInvitations = async () => {
        setIsLoading(true)
        setError(null)

        try {
          // Check cache first
          const cached = invitationCache.get(user.email!)
          const now = Date.now()
          
          if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            setPendingInvitations(cached.data)
            setIsLoading(false)
            setCheckComplete(true)
            setLastCheckedEmail(user.email!)
            return
          }

          // If there's already a pending request for this email, wait for it
          if (cached?.promise) {
            await cached.promise
            const updatedCache = invitationCache.get(user.email!)
            if (updatedCache) {
              setPendingInvitations(updatedCache.data)
              setIsLoading(false)
              setCheckComplete(true)
              setLastCheckedEmail(user.email!)
              return
            }
          }

          // Create new request
          const requestPromise = getUserPendingInvitations(user.email!)
          
          // Store the promise in cache to prevent duplicate requests
          invitationCache.set(user.email!, {
            data: [],
            timestamp: now,
            promise: requestPromise
          })

          const result = await requestPromise
          
          if (result.error) {
            console.error('Error checking for invitations:', result.error)
            setError(result.error)
            setPendingInvitations([])
            // Remove failed request from cache
            invitationCache.delete(user.email!)
          } else {
            const invitations = result.data || []
            setPendingInvitations(invitations)
            
            // Update cache with successful result
            invitationCache.set(user.email!, {
              data: invitations,
              timestamp: now,
              promise: undefined
            })
          }
        } catch (error) {
          console.error('Unexpected error checking for invitations:', error)
          setError('Failed to check for pending invitations')
          setPendingInvitations([])
          // Remove failed request from cache
          invitationCache.delete(user.email!)
        } finally {
          setIsLoading(false)
          setCheckComplete(true)
          setLastCheckedEmail(user.email!)
        }
      }

      checkForInvitations()
    }, 500) // 500ms debounce

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [user, authLoading, checkComplete, lastCheckedEmail, isLoading])

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