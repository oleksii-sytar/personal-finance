'use client'

import { useState } from 'react'
import { Suspense } from 'react'
import { createPortal } from 'react-dom'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { LazyInviteMemberForm } from '@/components/forms/lazy'
import { FormLoadingSkeleton } from '@/components/shared/form-loading-skeleton'
import { useWorkspace } from '@/contexts/workspace-context'
import { useAuth } from '@/contexts/auth-context'
import type { WorkspaceMemberWithProfile } from '@/lib/supabase/types'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  variant?: 'danger' | 'warning'
}

/**
 * Confirmation dialog for destructive actions
 */
function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger'
}: ConfirmationDialogProps) {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className={variant === 'danger' ? 'text-[var(--accent-error)]' : 'text-amber-400'}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-secondary mb-6">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <LoadingButton
              onClick={onConfirm}
              loading={isLoading}
              loadingText="Processing..."
              variant={variant === 'danger' ? 'outline' : 'primary'}
              className={variant === 'danger' ? 'border-red-400 text-[var(--accent-error)] hover:bg-red-400/10' : ''}
            >
              {confirmText}
            </LoadingButton>
            <LoadingButton
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
            >
              {cancelText}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  )
}

interface MemberItemProps {
  member: WorkspaceMemberWithProfile
  currentUserId: string
  isOwner: boolean
  onRemove: (memberId: string) => void
  onTransferOwnership: (memberId: string) => void
}

/**
 * Individual member item component
 */
function MemberItem({ 
  member, 
  currentUserId, 
  isOwner, 
  onRemove, 
  onTransferOwnership 
}: MemberItemProps) {
  const isCurrentUser = member.user_id === currentUserId
  const isMemberOwner = member.role === 'owner'
  
  // Get display name and initials - fallback to user_id if no profile
  const displayName = member.user_profiles?.full_name || member.user_id || 'Unknown User'
  const initials = member.user_profiles?.full_name
    ? member.user_profiles.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : member.user_id?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="flex items-center justify-between p-4 bg-glass rounded-xl border border-glass">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-primary)] to-[#F4B76D] rounded-full flex items-center justify-center">
          <span className="text-[#1C1917] font-semibold text-sm">
            {initials}
          </span>
        </div>
        <div>
          <p className="text-primary font-medium">
            {displayName}
            {isCurrentUser && <span className="text-secondary text-sm ml-2">(You)</span>}
          </p>
          <p className="text-secondary text-sm capitalize">
            {member.role}
            {isMemberOwner && ' 👑'}
          </p>
        </div>
      </div>

      {isOwner && !isCurrentUser && (
        <div className="flex items-center space-x-2">
          {!isMemberOwner && (
            <>
              <LoadingButton
                size="sm"
                variant="ghost"
                onClick={() => onTransferOwnership(member.id)}
                className="text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80"
              >
                Make Owner
              </LoadingButton>
              <LoadingButton
                size="sm"
                variant="ghost"
                onClick={() => onRemove(member.id)}
                className="text-[var(--accent-error)] hover:text-[var(--accent-error)]/80"
              >
                Remove
              </LoadingButton>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * MemberManagement component for viewing and managing workspace members
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function MemberManagement() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'remove' | 'transfer'
    memberId: string
    memberName: string
  }>({
    isOpen: false,
    type: 'remove',
    memberId: '',
    memberName: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()
  const { 
    currentWorkspace, 
    members, 
    invitations, 
    removeMember, 
    transferOwnership 
  } = useWorkspace()

  if (!currentWorkspace || !user) {
    return (
      <Card>
        <CardContent>
          <p className="text-secondary text-center py-8">
            No workspace selected
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentMember = members.find(m => m.user_id === user.id)
  const isOwner = currentMember?.role === 'owner'

  const handleRemoveMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const displayName = member.user_profiles?.full_name || member.user_id || 'Unknown User'
    setConfirmDialog({
      isOpen: true,
      type: 'remove',
      memberId,
      memberName: displayName
    })
  }

  const handleTransferOwnership = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    const displayName = member.user_profiles?.full_name || member.user_id || 'Unknown User'
    setConfirmDialog({
      isOpen: true,
      type: 'transfer',
      memberId,
      memberName: displayName
    })
  }

  const confirmAction = async () => {
    if (!confirmDialog.memberId) return

    try {
      setIsLoading(true)
      setError(null)

      if (confirmDialog.type === 'remove') {
        await removeMember(confirmDialog.memberId)
      } else if (confirmDialog.type === 'transfer') {
        await transferOwnership(confirmDialog.memberId)
      }

      setConfirmDialog({ isOpen: false, type: 'remove', memberId: '', memberName: '' })
    } catch (error) {
      console.error('Error performing action:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const cancelAction = () => {
    setConfirmDialog({ isOpen: false, type: 'remove', memberId: '', memberName: '' })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workspace Members</CardTitle>
            {isOwner && (
              <Button
                onClick={() => setShowInviteForm(true)}
                size="sm"
              >
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-lg">
              <p className="text-sm text-[var(--accent-error)]">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-secondary text-center py-8">
                No members found
              </p>
            ) : (
              members.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  currentUserId={user.id}
                  isOwner={isOwner}
                  onRemove={handleRemoveMember}
                  onTransferOwnership={handleTransferOwnership}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-glass rounded-xl border border-glass"
                >
                  <div>
                    <p className="text-primary font-medium">{invitation.email}</p>
                    <p className="text-secondary text-sm">
                      Invited {invitation.created_at ? new Date(invitation.created_at).toLocaleDateString() : 'Unknown'}
                      {' • '}
                      Expires {invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const inviteUrl = `${window.location.origin}/auth/invite?token=${invitation.token}`
                        navigator.clipboard.writeText(inviteUrl)
                        // You could add a toast notification here
                        console.log('Invite link copied:', inviteUrl)
                      }}
                      className="text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 text-xs"
                    >
                      Copy Link
                    </Button>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Modal */}
      {showInviteForm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <Suspense fallback={<FormLoadingSkeleton variant="workspace" />}>
            <LazyInviteMemberForm
              onSuccess={() => setShowInviteForm(false)}
              onCancel={() => setShowInviteForm(false)}
            />
          </Suspense>
        </div>,
        document.body
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === 'remove' 
            ? 'Remove Member' 
            : 'Transfer Ownership'
        }
        message={
          confirmDialog.type === 'remove'
            ? `Are you sure you want to remove ${confirmDialog.memberName} from this workspace? They will lose access to all workspace data immediately.`
            : `Are you sure you want to transfer ownership to ${confirmDialog.memberName}? You will become a regular member and lose administrative privileges.`
        }
        confirmText={
          confirmDialog.type === 'remove' 
            ? 'Remove Member' 
            : 'Transfer Ownership'
        }
        cancelText="Cancel"
        onConfirm={confirmAction}
        onCancel={cancelAction}
        isLoading={isLoading}
        variant={confirmDialog.type === 'remove' ? 'danger' : 'warning'}
      />
    </div>
  )
}