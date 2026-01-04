'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useWorkspace } from '@/contexts/workspace-context'
import { workspaceInviteSchema } from '@/lib/validations/workspace'
import type { WorkspaceInviteInput } from '@/lib/validations/workspace'

interface InviteMemberFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * InviteMemberForm component for inviting members to workspaces
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function InviteMemberForm({ 
  onSuccess, 
  onCancel 
}: InviteMemberFormProps) {
  const [formData, setFormData] = useState<WorkspaceInviteInput>({
    email: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  
  const { inviteMember, currentWorkspace } = useWorkspace()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validate form data
      const validated = workspaceInviteSchema.safeParse(formData)
      
      if (!validated.success) {
        const fieldErrors: Record<string, string> = {}
        validated.error.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message
          }
        })
        setErrors(fieldErrors)
        return
      }

      if (!currentWorkspace) {
        setErrors({ general: 'No workspace selected' })
        return
      }

      // Send invitation
      const result = await inviteMember(validated.data.email)
      
      if (result.error) {
        if (typeof result.error === 'string') {
          setErrors({ general: result.error })
        } else {
          // Handle validation errors from server
          const fieldErrors: Record<string, string> = {}
          Object.entries(result.error).forEach(([key, messages]) => {
            fieldErrors[key] = Array.isArray(messages) ? messages[0] : messages
          })
          setErrors(fieldErrors)
        }
        return
      }

      // Success - reset form and call onSuccess callback
      setFormData({ email: '' })
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error inviting member:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({ email: '' })
    setErrors({})
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">
            Invite Member
          </h3>
          <p className="text-[var(--text-secondary)] text-sm">
            Send an invitation to join {currentWorkspace?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={isLoading}
            error={errors.email}
            required
          />

          {errors.general && (
            <div className="p-3 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-lg">
              <p className="text-sm text-[var(--accent-error)]">{errors.general}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={isLoading || !formData.email.trim()}
              className="flex-1"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="text-xs text-[var(--text-secondary)] opacity-80 text-center">
          Invitations expire after 7 days
        </div>
      </div>
    </Card>
  )
}