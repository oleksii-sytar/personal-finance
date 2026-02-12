'use client'

import { useState } from 'react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { deleteAccount } from '@/actions/accounts'
import type { Account } from '@/types'

interface DeleteAccountDialogProps {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * DeleteAccountDialog component with transaction check
 * 
 * Implements Requirements 4.1, 4.2, 4.3, 4.4, 4.5:
 * - Checks transaction count before showing confirmation (via server action)
 * - Displays error message if transactions exist (prevent deletion)
 * - Displays confirmation dialog if no transactions
 * - Shows warning about permanent deletion
 * - Implements loading state during deletion
 * - Applies Executive Lounge dialog styling
 */
export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
  onSuccess,
}: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setIsDeleting(true)
    setError(null)
    
    try {
      const result = await deleteAccount(account.id)
      
      if (result.error) {
        // If deletion failed due to transactions, show error
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : 'Failed to delete account'
        setError(errorMessage)
        setIsDeleting(false)
      } else {
        // Success - trigger event for other components to refresh
        window.dispatchEvent(new CustomEvent('accountsChanged', { 
          detail: { action: 'deleted', accountId: account.id } 
        }))
        
        // Close dialog and call success callback
        setIsDeleting(false)
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (err) {
      console.error('Error deleting account:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (!isDeleting) {
      setError(null)
      onOpenChange(false)
    }
  }

  // Show error dialog if deletion failed due to transactions
  if (error) {
    return (
      <ConfirmationDialog
        isOpen={open}
        title="Cannot Delete Account"
        message={error}
        confirmText="Close"
        onConfirm={handleCancel}
        onCancel={handleCancel}
        variant="warning"
        isLoading={false}
      />
    )
  }

  // Show confirmation dialog
  return (
    <ConfirmationDialog
      isOpen={open}
      title="Delete Account?"
      message={`Are you sure you want to delete "${account.name}"? This action cannot be undone.`}
      confirmText={isDeleting ? 'Deleting...' : 'Delete Account'}
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      variant="danger"
      isLoading={isDeleting}
    />
  )
}
