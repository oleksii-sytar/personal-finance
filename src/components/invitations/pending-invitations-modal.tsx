'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { InvitationCard } from '@/components/invitations/invitation-card'
import { acceptMultipleInvitations, declineMultipleInvitations, type PendingInvitation } from '@/lib/services/invitation-service'
import { useWorkspace } from '@/contexts/workspace-context'

interface PendingInvitationsModalProps {
  invitations: PendingInvitation[]
  onClose: () => void
  onInvitationsProcessed: () => void
}

/**
 * Modal component for showing pending invitations
 * Can be triggered from anywhere in the app when invitations are detected
 */
export function PendingInvitationsModal({ 
  invitations, 
  onClose, 
  onInvitationsProcessed 
}: PendingInvitationsModalProps) {
  const router = useRouter()
  const { refreshWorkspaces } = useWorkspace()
  
  const [selectedInvitations, setSelectedInvitations] = useState<Set<string>>(
    new Set(invitations.map(inv => inv.id)) // Auto-select all by default
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        
        // Close modal and notify parent
        onInvitationsProcessed()
        onClose()
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
        // Notify parent and close modal
        onInvitationsProcessed()
        onClose()
      }
    } catch (error) {
      console.error('Error declining invitations:', error)
      setError('Failed to decline invitations')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewAll = () => {
    onClose()
    router.push('/auth/accept-invitations')
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Pending Invitations</CardTitle>
              <button
                onClick={onClose}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                disabled={isProcessing}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-[var(--text-secondary)]">
              You have {invitations.length} pending workspace invitation{invitations.length !== 1 ? 's' : ''}.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-lg">
                <p className="text-sm text-[var(--accent-error)]">{error}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleAcceptSelected}
                disabled={selectedInvitations.size === 0 || isProcessing}
                size="sm"
              >
                {isProcessing ? 'Processing...' : `Accept Selected (${selectedInvitations.size})`}
              </Button>
              <Button
                onClick={handleDeclineSelected}
                variant="secondary"
                disabled={selectedInvitations.size === 0 || isProcessing}
                size="sm"
              >
                Decline Selected
              </Button>
              <Button
                onClick={handleViewAll}
                variant="secondary"
                disabled={isProcessing}
                size="sm"
              >
                View All Details
              </Button>
            </div>

            {/* Invitation Preview (show first 3) */}
            <div className="space-y-3">
              {invitations.slice(0, 3).map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  selected={selectedInvitations.has(invitation.id)}
                  onToggle={(selected) => handleInvitationToggle(invitation.id, selected)}
                  disabled={isProcessing}
                />
              ))}
              
              {invitations.length > 3 && (
                <div className="text-center py-2">
                  <p className="text-sm text-[var(--text-secondary)]">
                    And {invitations.length - 3} more invitation{invitations.length - 3 !== 1 ? 's' : ''}...
                  </p>
                  <Button
                    onClick={handleViewAll}
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                  >
                    View All
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between pt-4 border-t border-[var(--glass-border)]">
              <Button
                onClick={onClose}
                variant="secondary"
                disabled={isProcessing}
              >
                Remind Me Later
              </Button>
              <Button
                onClick={handleViewAll}
                variant="secondary"
                disabled={isProcessing}
              >
                Review All Invitations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  )
}