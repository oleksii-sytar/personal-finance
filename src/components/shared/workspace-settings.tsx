'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MemberManagement } from '@/components/shared/member-management'
import { useWorkspace } from '@/contexts/workspace-context'
import { useAuth } from '@/contexts/auth-context'
import { workspaceUpdateSchema } from '@/lib/validations/workspace'
import type { WorkspaceUpdateInput } from '@/lib/validations/workspace'

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className={variant === 'danger' ? 'text-red-400' : 'text-amber-400'}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 mb-6">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              variant={variant === 'danger' ? 'outline' : 'primary'}
              className={variant === 'danger' ? 'border-red-400 text-red-400 hover:bg-red-400/10' : ''}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
            <Button
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
            >
              {cancelText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * WorkspaceSettings component for managing workspace configuration
 * Requirements: 6.1, 6.2, 6.3
 */
export function WorkspaceSettings() {
  const [formData, setFormData] = useState<WorkspaceUpdateInput>({
    name: '',
    currency: 'UAH'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { user } = useAuth()
  const { currentWorkspace, members } = useWorkspace()

  // Initialize form data when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setFormData({
        name: currentWorkspace.name,
        currency: currentWorkspace.currency || 'UAH'
      })
    }
  }, [currentWorkspace])

  if (!currentWorkspace || !user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <p className="text-white/60 text-center py-8">
              No workspace selected
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentMember = members.find(m => m.user_id === user.id)
  const isOwner = currentMember?.role === 'owner'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    setErrors({})
    setIsLoading(true)

    try {
      // Validate form data
      const validated = workspaceUpdateSchema.safeParse(formData)
      
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

      // Workspace update functionality will be implemented in future version
      setErrors({ general: 'Workspace update feature is coming soon' })
      
      // For now, just simulate success
      setIsEditing(false)
      
    } catch (error) {
      console.error('Error updating workspace:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setFormData({
      name: currentWorkspace.name,
      currency: currentWorkspace.currency || 'UAH'
    })
    setErrors({})
  }

  const handleDeleteWorkspace = async () => {
    if (!isOwner) return

    setDeleteLoading(true)
    try {
      // Workspace deletion functionality will be implemented in future version
      setErrors({ general: 'Workspace deletion feature is coming soon' })
      
      // For now, just close the dialog
      setShowDeleteDialog(false)
      
    } catch (error) {
      console.error('Error deleting workspace:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Workspace Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workspace Settings</CardTitle>
            {isOwner && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="secondary"
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-white/90">
                  Workspace Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isLoading}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium text-white/90">
                  Primary Currency
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 focus:border-[#E6A65D] focus:outline-none focus:ring-2 focus:ring-[#E6A65D]/20"
                >
                  <option value="UAH">Ukrainian Hryvnia (UAH)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="PLN">Polish Zloty (PLN)</option>
                </select>
                {errors.currency && (
                  <p className="text-sm text-red-500">{errors.currency}</p>
                )}
              </div>

              {errors.general && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-500">{errors.general}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name?.trim()}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white/60">Workspace Name</label>
                <p className="text-white/90 font-medium">{currentWorkspace.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-white/60">Primary Currency</label>
                <p className="text-white/90 font-medium">{currentWorkspace.currency || 'UAH'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-white/60">Created</label>
                <p className="text-white/90 font-medium">
                  {currentWorkspace.created_at 
                    ? new Date(currentWorkspace.created_at).toLocaleDateString()
                    : 'Unknown'
                  }
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-white/60">Members</label>
                <p className="text-white/90 font-medium">{members.length}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Management */}
      <MemberManagement />

      {/* Danger Zone */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white/90 mb-2">Delete Workspace</h4>
                <p className="text-sm text-white/60 mb-4">
                  Permanently delete this workspace and all associated data. This action cannot be undone.
                </p>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="outline"
                  className="border-red-400 text-red-400 hover:bg-red-400/10"
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${currentWorkspace.name}"? This will permanently delete all transactions, categories, and member data. This action cannot be undone.`}
        confirmText="Delete Workspace"
        cancelText="Cancel"
        onConfirm={handleDeleteWorkspace}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={deleteLoading}
        variant="danger"
      />
    </div>
  )
}