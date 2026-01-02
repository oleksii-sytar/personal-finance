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
          ? 'ring-2 ring-[#E6A65D] bg-[#E6A65D]/5' 
          : 'hover:bg-white/5'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onToggle(!selected)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-[#E6A65D]">
            {invitation.workspace.name}
          </CardTitle>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => !disabled && onToggle(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-[#E6A65D] bg-white/5 border-white/20 rounded focus:ring-[#E6A65D]/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Inviter Info */}
        <div>
          <p className="text-sm text-white/60">Invited by</p>
          <p className="text-white/90 font-medium">{invitation.inviter.full_name}</p>
        </div>

        {/* Workspace Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/60">Currency</p>
            <p className="text-white/90">{invitation.workspace.currency}</p>
          </div>
          <div>
            <p className="text-white/60">Invited</p>
            <p className="text-white/90">{createdAt}</p>
          </div>
        </div>

        {/* Expiration Warning */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-white/50">
            Expires {expiresIn}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}