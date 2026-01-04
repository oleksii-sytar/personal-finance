'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { formatDistanceToNow } from 'date-fns'
import type { PendingInvitation } from '@/lib/services/invitation-service'

interface InvitationCardProps {
  invitation: PendingInvitation
  selected: boolean
  onToggle: (selected: boolean) => void
  disabled?: boolean
}

/**
 * Card component for displaying a single workspace invitation
 * Used in the invitation acceptance dashboard
 */
export function InvitationCard({ 
  invitation, 
  selected, 
  onToggle, 
  disabled = false 
}: InvitationCardProps) {
  const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })
  const createdAt = formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        selected 
          ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
          : 'hover:bg-[var(--bg-glass)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onToggle(!selected)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-[var(--accent-primary)]">
            {invitation.workspace.name}
          </CardTitle>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => !disabled && onToggle(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-[var(--accent-primary)] bg-[var(--bg-glass)] border-[var(--glass-border)] rounded focus:ring-[var(--accent-primary)]/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Inviter Info */}
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Invited by</p>
          <p className="text-[var(--text-primary)] font-medium">{invitation.inviter.full_name}</p>
        </div>

        {/* Workspace Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[var(--text-secondary)]">Currency</p>
            <p className="text-[var(--text-primary)]">{invitation.workspace.currency}</p>
          </div>
          <div>
            <p className="text-[var(--text-secondary)]">Invited</p>
            <p className="text-[var(--text-primary)]">{createdAt}</p>
          </div>
        </div>

        {/* Expiration Warning */}
        <div className="pt-2 border-t border-[var(--glass-border)]">
          <p className="text-xs text-[var(--text-secondary)] opacity-80">
            Expires {expiresIn}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}