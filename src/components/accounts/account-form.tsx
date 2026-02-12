'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { LoadingButton } from '@/components/ui/loading-button'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/toast'
import { accountFormSchema, type AccountFormInput, type AccountType } from '@/lib/validations/account'
import { useWorkspace } from '@/contexts/workspace-context'
import { createAccount, updateAccount } from '@/actions/accounts'
import type { Account } from '@/actions/accounts'

/**
 * AccountForm component for creating and editing accounts
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 3.5, 9.1-9.5
 * 
 * Features:
 * - Account name input (max 100 chars, required)
 * - Account type dropdown (checking, savings, credit, investment)
 * - Opening balance input (only shown on create mode, immutable after creation)
 * - Currency display (read-only, inherited from workspace)
 * - Real-time validation with Zod
 * - Executive Lounge styling (glass inputs, rounded corners)
 * - Loading states during submission
 * - Sets both opening_balance and current_balance to same value on creation
 */
interface AccountFormProps {
  account?: Account // undefined for create, populated for edit
  onSuccess?: () => void
  onCancel?: () => void
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEditMode = !!account
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const { success, error: showError } = useToast()
  
  const [formData, setFormData] = useState<AccountFormInput>({
    name: account?.name || '',
    type: account?.type || 'checking',
    opening_balance: account?.opening_balance || 0,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Update form data when account prop changes (for edit mode)
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        opening_balance: account.opening_balance,
      })
    }
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      // Validate form data with Zod
      const validated = accountFormSchema.safeParse(formData)
      
      if (!validated.success) {
        // Convert Zod errors to field errors
        const fieldErrors: Record<string, string> = {}
        validated.error.errors.forEach((error) => {
          if (error.path[0]) {
            const field = error.path[0] as string
            fieldErrors[field] = error.message
          }
        })
        setErrors(fieldErrors)
        setIsLoading(false)
        return
      }

      // Create FormData for server action
      const submitData = new FormData()
      submitData.set('name', validated.data.name)
      submitData.set('type', validated.data.type)
      
      if (!isEditMode) {
        // Only include opening_balance for create mode
        // Set both opening_balance and current_balance to the same value
        submitData.set('opening_balance', validated.data.opening_balance?.toString() || '0')
        submitData.set('current_balance', validated.data.opening_balance?.toString() || '0')
      }

      // Call appropriate server action
      const result = isEditMode
        ? await updateAccount(account.id, submitData)
        : await createAccount(submitData)

      if (result.error) {
        // Handle server errors
        if (typeof result.error === 'string') {
          setErrors({ general: result.error })
          showError(
            isEditMode ? 'Failed to update account' : 'Failed to create account',
            result.error
          )
        } else {
          // Handle validation errors from server
          const fieldErrors: Record<string, string> = {}
          Object.entries(result.error).forEach(([key, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              fieldErrors[key] = messages[0]
            } else if (typeof messages === 'string') {
              fieldErrors[key] = messages
            }
          })
          setErrors(fieldErrors)
          showError(
            isEditMode ? 'Validation failed' : 'Validation failed',
            'Please check the form for errors'
          )
        }
        return
      }

      // Success! Show toast notification
      success(
        isEditMode ? 'Account updated' : 'Account created',
        isEditMode 
          ? `${result.data?.name} has been updated successfully`
          : `${result.data?.name} has been created successfully`
      )

      // Trigger custom event for other components to refresh
      window.dispatchEvent(new CustomEvent('accountsChanged', { 
        detail: { action: isEditMode ? 'updated' : 'created', account: result.data } 
      }))

      // Refresh the page to show updated data
      router.refresh()

      // Call success callback (closes modal)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Account form submission error:', error)
      setErrors({ general: 'An unexpected error occurred' })
      showError(
        'Unexpected error',
        'Something went wrong. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Account type options with user-friendly labels
  const accountTypes: Array<{ value: AccountType; label: string }> = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Account' },
    { value: 'investment', label: 'Investment Account' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Account Name Input */}
      <div className="space-y-2">
        <label htmlFor="account-name" className="block text-sm font-medium text-[var(--text-primary)]">
          Account Name
        </label>
        <Input
          id="account-name"
          type="text"
          placeholder="e.g., Main Checking, Emergency Savings"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          disabled={isLoading}
          maxLength={100}
          className={errors.name ? 'border-[var(--accent-error)]/50' : ''}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'account-name-error' : undefined}
        />
        {errors.name && (
          <p id="account-name-error" className="text-sm text-[var(--accent-error)]">
            {errors.name}
          </p>
        )}
      </div>

      {/* Account Type Dropdown */}
      <div className="space-y-2">
        <label htmlFor="account-type" className="block text-sm font-medium text-[var(--text-primary)]">
          Account Type
        </label>
        <select
          id="account-type"
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AccountType }))}
          disabled={isLoading}
          className="form-input w-full"
          aria-invalid={!!errors.type}
          aria-describedby={errors.type ? 'account-type-error' : undefined}
        >
          {accountTypes.map(({ value, label }) => (
            <option 
              key={value} 
              value={value}
              className="bg-[var(--bg-secondary)] text-[var(--text-primary)]"
            >
              {label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p id="account-type-error" className="text-sm text-[var(--accent-error)]">
            {errors.type}
          </p>
        )}
      </div>

      {/* Opening Balance Input (Create Mode Only) */}
      {!isEditMode && (
        <div className="space-y-2">
          <label htmlFor="opening-balance" className="block text-sm font-medium text-[var(--text-primary)]">
            Opening Balance
          </label>
          <Input
            id="opening-balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.opening_balance ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setFormData(prev => ({ 
                ...prev, 
                opening_balance: value === '' ? 0 : parseFloat(value) || 0
              }))
            }}
            disabled={isLoading}
            className={errors.opening_balance ? 'border-[var(--accent-error)]/50' : ''}
            aria-invalid={!!errors.opening_balance}
            aria-describedby={errors.opening_balance ? 'opening-balance-error opening-balance-help' : 'opening-balance-help'}
          />
          <p id="opening-balance-help" className="text-xs text-[var(--text-secondary)]">
            {formData.type === 'credit' 
              ? 'For credit cards, use negative values for debt (e.g., -1000 for $1000 owed). Opening balance cannot be changed after account creation.'
              : 'The starting balance for this account. Opening balance cannot be changed after account creation.'}
          </p>
          {errors.opening_balance && (
            <p id="opening-balance-error" className="text-sm text-[var(--accent-error)]">
              {errors.opening_balance}
            </p>
          )}
        </div>
      )}

      {/* Currency Display (Read-Only) */}
      <div className="space-y-2">
        <label htmlFor="currency" className="block text-sm font-medium text-[var(--text-primary)]">
          Currency
        </label>
        <div className="form-input w-full bg-[var(--bg-secondary)] opacity-60 cursor-not-allowed">
          {currentWorkspace?.currency || 'UAH'}
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Currency is inherited from your workspace settings
        </p>
      </div>

      {/* General Error Message */}
      {errors.general && (
        <div className="p-3 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-lg">
          <p className="text-sm text-[var(--accent-error)]">{errors.general}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <LoadingButton
          type="submit"
          loading={isLoading}
          loadingText={isEditMode ? 'Saving...' : 'Creating...'}
          disabled={!formData.name.trim()}
          className="flex-1"
        >
          {isEditMode ? 'Save Changes' : 'Create Account'}
        </LoadingButton>

        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
