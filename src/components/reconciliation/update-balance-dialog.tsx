'use client'

/**
 * UpdateBalanceDialog Component
 * 
 * A dialog component that allows users to update the current balance for an account.
 * Displays the current calculated balance as reference and shows a preview of the
 * new difference before saving.
 * 
 * Requirements:
 * - 2.1: Provide "Update Current Balance" action
 * - 2.2: Display current calculated balance as reference
 * - 2.3: Accept any valid numeric value (positive or negative)
 * 
 * Design System:
 * - Uses Executive Lounge aesthetic with glass card styling
 * - Single Malt (#E6A65D) for primary actions
 * - Warm colors and generous spacing
 * - Responsive for mobile and desktop
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XIcon, InfoIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { updateCurrentBalance, getAccountDifference, type AccountBalance } from '@/actions/balance-reconciliation'
import { formatCurrency } from '@/lib/utils/format'
import type { Account } from '@/actions/accounts'

interface UpdateBalanceDialogProps {
  isOpen: boolean
  account: Account
  onClose: () => void
  onSuccess?: () => void
  className?: string
}

/**
 * UpdateBalanceDialog
 * 
 * Implements Requirements 2.1, 2.2, 2.3:
 * - Provides UI for updating current balance
 * - Shows calculated balance as reference
 * - Accepts any valid numeric value (positive or negative)
 * - Shows preview of new difference before saving
 */
export function UpdateBalanceDialog({
  isOpen,
  account,
  onClose,
  onSuccess,
  className
}: UpdateBalanceDialogProps) {
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [newBalance, setNewBalance] = useState<string>('')
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch account balance data when dialog opens
  useEffect(() => {
    async function fetchAccountBalance() {
      if (!isOpen || !account.id) return
      
      setIsFetching(true)
      setError(null)
      
      const result = await getAccountDifference(account.id)
      
      if (result.error) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : 'Failed to fetch account balance'
        setError(errorMessage)
        setIsFetching(false)
        return
      }
      
      if (result.data) {
        setAccountBalance(result.data)
        // Initialize input with current balance
        setNewBalance(result.data.current_balance.toString())
      }
      
      setIsFetching(false)
    }

    if (isOpen) {
      fetchAccountBalance()
    }
  }, [isOpen, account.id])

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNewBalance('')
      setAccountBalance(null)
      setError(null)
      setValidationError(null)
      setIsLoading(false)
      setIsFetching(true)
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewBalance(value)
    setValidationError(null)
  }

  const validateInput = (): boolean => {
    // Allow empty input temporarily
    if (newBalance.trim() === '') {
      setValidationError('Balance is required')
      return false
    }

    // Check if it's a valid number
    const numValue = parseFloat(newBalance)
    if (isNaN(numValue)) {
      setValidationError('Please enter a valid number')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateInput()) {
      return
    }

    setIsLoading(true)
    setError(null)

    const numValue = parseFloat(newBalance)
    const result = await updateCurrentBalance(account.id, numValue)

    if (result.error) {
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : 'Failed to update balance'
      setError(errorMessage)
      setIsLoading(false)
      return
    }

    // Invalidate all relevant queries to trigger recalculation
    await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    await queryClient.invalidateQueries({ queryKey: ['accountBalances'] })
    await queryClient.invalidateQueries({ queryKey: ['reconciliationStatus'] })
    await queryClient.invalidateQueries({ queryKey: ['spendingTrends'] })

    // Success
    setIsLoading(false)
    onSuccess?.()
    onClose()
  }

  // Calculate preview difference
  const getPreviewDifference = (): number | null => {
    if (!accountBalance || newBalance.trim() === '') return null
    
    const numValue = parseFloat(newBalance)
    if (isNaN(numValue)) return null
    
    return numValue - accountBalance.calculated_balance
  }

  const previewDifference = getPreviewDifference()
  const hasChanged = accountBalance && parseFloat(newBalance) !== accountBalance.current_balance

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50"
      onClick={handleBackdropClick}
    >
      <Card className={cn(
        'w-full max-w-md bg-[var(--bg-glass)] border-[var(--border-glass)]',
        'animate-in zoom-in-95 duration-200',
        className
      )}>
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] font-space-grotesk">
              Update Current Balance
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-1 hover:bg-[var(--bg-glass)] rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <XIcon className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Account Name */}
          <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)]">Account</p>
            <p className="text-base font-medium text-[var(--text-primary)]">{account.name}</p>
          </div>

          {/* Loading State */}
          {isFetching && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-[var(--bg-glass)] rounded-xl" />
              <div className="h-16 bg-[var(--bg-glass)] rounded-xl" />
            </div>
          )}

          {/* Error State */}
          {error && !isFetching && (
            <div className="mb-4 p-4 bg-[var(--accent-error)]/10 border border-[var(--accent-error)]/20 rounded-xl">
              <p className="text-sm text-[var(--accent-error)]">{error}</p>
            </div>
          )}

          {/* Content */}
          {!isFetching && accountBalance && (
            <div className="space-y-4">
              {/* Calculated Balance Reference (Requirement 2.2) */}
              <div className="bg-[var(--bg-glass)] backdrop-blur-[16px] border border-[var(--border-glass)] p-4 rounded-xl">
                <div className="flex items-start gap-2 mb-2">
                  <InfoIcon className="w-4 h-4 text-[var(--accent-primary)] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[var(--text-secondary)]">
                    Calculated from opening balance + transactions
                  </p>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">Calculated Balance</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] font-space-grotesk">
                  {formatCurrency(accountBalance.calculated_balance, account.currency)}
                </p>
              </div>

              {/* Current Balance Input (Requirement 2.3: accept any valid numeric value) */}
              <div>
                <Input
                  type="number"
                  step="0.01"
                  label="Current Balance (from bank)"
                  value={newBalance}
                  onChange={handleInputChange}
                  error={validationError || undefined}
                  disabled={isLoading}
                  placeholder="Enter current balance"
                  autoFocus
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Enter the actual balance shown in your bank account
                </p>
              </div>

              {/* Preview of New Difference */}
              {hasChanged && previewDifference !== null && (
                <div className={cn(
                  'p-4 rounded-xl border transition-all duration-200',
                  previewDifference === 0 
                    ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/20'
                    : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20'
                )}>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    New Difference
                  </p>
                  {previewDifference === 0 ? (
                    <p className="text-base font-semibold text-[var(--accent-success)]">
                      ✓ Reconciled
                    </p>
                  ) : (
                    <p className={cn(
                      'text-base font-semibold',
                      previewDifference > 0 
                        ? 'text-[var(--accent-success)]' 
                        : 'text-[var(--accent-error)]'
                    )}>
                      {previewDifference > 0 ? '+' : ''}
                      {formatCurrency(previewDifference, account.currency)}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {previewDifference > 0 
                      ? 'Positive difference: Check for missing income or extra expenses'
                      : previewDifference < 0
                      ? 'Negative difference: Check for missing expenses or extra income'
                      : 'Account will be reconciled'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!isFetching && accountBalance && (
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <Button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !!validationError}
                className="flex-1"
              >
                {isLoading ? 'Updating...' : 'Update Balance'}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>,
    document.body
  )
}
