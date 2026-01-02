'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { InvitationCard } from '@/components/invitations/invitation-card'
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { getUserPendingInvitations, acceptMultipleInvitations, declineMultipleInvitations, type PendingInvitation } from '@/lib/services/invitation-service'

/**
 * Content component for accepting multiple pending invitations
 * This is the main UI for the post-login invitation acceptance flow
 */
export function AcceptInvitationsContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { refreshWorkspaces } = useWorkspace()
  
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load pending invitations
  useEffect(() => {
    if (!user?.email) {
      router.push('/auth/login')
      return
    }

    const loadInvitations = async () => {
      if (!user?.email) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await getUserPendingInvitations(user.email)
        
        if (result.error) {
          setError(result.error)
          setInvitations([])
        } else {
          const pendingInvitations = result.data || []
          setInvitations(pendingInvitations)
          
          // If no invitations, redirect to dashboard
          if (pendingInvitations.length === 0) {
            router.push('/dashboard')
            return
          }
          
          // Auto-select all invitations by default
          setSelectedInvitations(new Set(pendingInvitations.map(inv => inv.id)))
        }
      } catch (error) {
        console.error('Error loading invitations:', error)
        setError('Failed to load invitations')
      } finally {
        setIsLoading(false)
      }
    }

    loadInvitations()
  }, [user, router]) // Dependencies are stable

  const loadInvitations = async () => {
    if (!user?.email) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getUserPendingInvitations(user.email)
      
      if (result.error) {
        setError(result.error)
        setInvitations([])
      } else {
        const pendingInvitations = result.data || []
        setInvitations(pendingInvitations)
        
        // If no invitations, redirect to dashboard
        if (pendingInvitations.length === 0) {
          router.push('/dashboard')
          return
        }
        
        // Auto-select all invitations by default
        setSelectedInvitations(new Set(pendingInvitations.map(inv => inv.id)))
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
      setError('Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvitationToggle = (invitationId: string, selected: boolean) => {
    setSelectedInvitations(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(invitationId)
      } else {
        newSet.delete(invitationId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    setSelectedInvitations(new Set(invitations.map(inv => inv.id)))
  }

  const handleSelectNone = () => {
    setSelectedInvitations(new Set())
  }

  const handleAcceptSelected = async () => {
    if (selectedInvitations.size === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await acceptMultipleInvitations(Array.from(selectedInvitations))
      
      if (result.error) {
        setError(result.error)
      } else {
        // Refresh workspaces to include newly joined workspaces
        await refreshWorkspaces()
        
        // Show success and redirect to dashboard
        router.push('/dashboard?invitation_accepted=true')
      }
    } catch (error) {
      console.error('Error accepting invitations:', error)
      setError('Failed to accept invitations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeclineSelected = async () => {
    if (selectedInvitations.size === 0) return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await declineMultipleInvitations(Array.from(selectedInvitations))
      
      if (result.error) {
        setError(result.error)
      } else {
        // Remove declined invitations from the list
        setInvitations(prev => prev.filter(inv => !selectedInvitations.has(inv.id)))
        setSelectedInvitations(new Set())
        
        // If no more invitations, redirect to dashboard
        const remainingInvitations = invitations.filter(inv => !selectedInvitations.has(inv.id))
        if (remainingInvitations.length === 0) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error declining invitations:', error)
      setError('Failed to decline invitations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkipForNow = () => {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-[#E6A65D] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/60">Loading your invitations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-400">Error Loading Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">{error}</p>
          <div className="flex gap-3">
            <Button onClick={loadInvitations} variant="secondary">
              Try Again
            </Button>
            <Button onClick={handleSkipForNow} variant="secondary">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">
            You don't have any pending workspace invitations at this time.
          </p>
          <Button onClick={handleSkipForNow}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Workspace Invitations</CardTitle>
          <p className="text-white/60">
            You have {invitations.length} pending workspace invitation{invitations.length !== 1 ? 's' : ''}. 
            Review and choose which workspaces you'd like to join.
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Selection Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              onClick={handleSelectAll}
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              Select All
            </Button>
            <Button
              onClick={handleSelectNone}
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              Select None
            </Button>
            <span className="text-sm text-white/60">
              {selectedInvitations.size} of {invitations.length} selected
            </span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAcceptSelected}
              disabled={selectedInvitations.size === 0 || isProcessing}
              className="flex-1 min-w-[120px]"
            >
              {isProcessing ? 'Processing...' : `Accept Selected (${selectedInvitations.size})`}
            </Button>
            <Button
              onClick={handleDeclineSelected}
              variant="secondary"
              disabled={selectedInvitations.size === 0 || isProcessing}
              className="flex-1 min-w-[120px]"
            >
              Decline Selected
            </Button>
            <Button
              onClick={handleSkipForNow}
              variant="secondary"
              disabled={isProcessing}
            >
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            selected={selectedInvitations.has(invitation.id)}
            onToggle={(selected) => handleInvitationToggle(invitation.id, selected)}
            disabled={isProcessing}
          />
        ))}
      </div>
    </div>
  )
}