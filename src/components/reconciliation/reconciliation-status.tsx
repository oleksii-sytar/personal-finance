'use client'

/**
 * ReconciliationStatus Component
 * 
 * Displays per-account reconciliation difference in the account list.
 * Shows "Reconciled" badge when difference is zero, or the difference amount
 * with color coding (positive/negative) when non-zero.
 * 
 * Requirements:
 * - 6.1: Display reconciliation difference for each account
 * - 6.2: Show difference amount in account's currency
 * - 6.3: Display "Reconciled" badge when difference is zero
 * - 6.4: Display difference amount with visual emphasis when non-zero
 * - 11.1: Provide quick "Add Transaction" action
 * - 11.2: Pre-select account when opening transaction form
 * - 11.3: Suggest transaction type based on difference direction
 * - 11.4: Show updated difference after transaction added
 * - 11.5: Display success message when difference reaches zero
 * 
 * Design System:
 * - Uses Executive Lounge aesthetic with glass card styling
 * - Growth Emerald (#4E7A58) for success/reconciled states
 * - Single Malt (#E6A65D) for warning states
 * - Appropriate error color for negative differences
 * - Warm colors and generous spacing
 */

import { useEffect, useState } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import { getAccountDifference, type AccountBalance } from '@/actions/balance-reconciliation'
import { formatCurrency } from '@/lib/utils/format'
import { Button } from '@/components/ui/Button'
import { QuickEntryForm } from '@/components/transactions/quick-entry-form'
import type { TransactionType } from '@/types/transactions'

interface ReconciliationStatusProps {
  accountId: string
  className?: string
  showAddTransaction?: boolean // Requirement 11.1: Enable quick action
}

export function ReconciliationStatus({ 
  accountId, 
  className = '',
  showAddTransaction = false 
}: ReconciliationStatusProps) {
  const [accountBalance, setAccountBalance] = useState<AccountBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [previousDifference, setPreviousDifference] = useState<number | null>(null)

  useEffect(() => {
    async function fetchAccountDifference() {
      setIsLoading(true)
      setError(null)
      
      const result = await getAccountDifference(accountId)
      
      if (result.error) {
        // Handle error - convert to string if needed
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : 'Failed to fetch account difference'
        setError(errorMessage)
        setIsLoading(false)
        return
      }
      
      if (result.data) {
        // Track previous difference for success message (Requirement 11.5)
        if (accountBalance && !accountBalance.is_reconciled && result.data.is_reconciled) {
          // Just became reconciled - show success message
          setPreviousDifference(accountBalance.difference)
        }
        setAccountBalance(result.data)
      }
      
      setIsLoading(false)
    }

    if (accountId) {
      fetchAccountDifference()
    }
  }, [accountId])

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-end gap-2 animate-pulse ${className}`}
        role="status"
        aria-label="Loading reconciliation status"
      >
        <div className="text-right">
          <div className="w-16 h-3 bg-[var(--text-muted)] rounded opacity-20 mb-1" />
          <div className="w-20 h-4 bg-[var(--text-muted)] rounded opacity-20" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !accountBalance) {
    return null // Silently fail - don't show status if there's an error
  }

  // Success state - Reconciled (Requirement 6.3)
  if (accountBalance.is_reconciled) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div 
          className="flex items-center gap-2 text-[var(--accent-success)]"
          role="status"
          aria-label="Account reconciled"
        >
          <CheckCircle className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">Reconciled</span>
        </div>
        
        {/* Requirement 11.5: Success message when difference reaches zero */}
        {previousDifference !== null && (
          <div className="text-xs text-[var(--accent-success)] bg-[var(--accent-success)]/10 px-2 py-1 rounded">
            ✓ Reconciliation complete! (was {previousDifference > 0 ? '+' : ''}{formatCurrency(previousDifference, accountBalance.currency)})
          </div>
        )}
      </div>
    )
  }

  // Non-zero difference state (Requirement 6.4)
  const isPositive = accountBalance.difference > 0
  const formattedDifference = formatCurrency(
    Math.abs(accountBalance.difference),
    accountBalance.currency
  )
  
  // Requirement 11.3: Suggest transaction type based on difference direction
  const suggestedType: TransactionType = isPositive ? 'income' : 'expense'

  return (
    <div className={`space-y-2 ${className}`}>
      <div 
        className="text-right"
        role="status"
        aria-label={`Reconciliation difference: ${isPositive ? '+' : '-'}${formattedDifference}`}
      >
        <p className="text-sm text-[var(--text-secondary)] mb-0.5">
          Difference
        </p>
        <p className={`font-semibold text-base ${
          isPositive 
            ? 'text-[var(--accent-success)]' 
            : 'text-[var(--accent-error)]'
        }`}>
          {isPositive ? '+' : '-'}{formattedDifference}
        </p>
      </div>
      
      {/* Requirement 11.1: Quick "Add Transaction" action */}
      {showAddTransaction && (
        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowTransactionForm(true)}
            className="w-full text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Transaction
          </Button>
        </div>
      )}
      
      {/* Transaction form modal (Requirements 11.2, 11.3, 11.4) */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <QuickEntryForm
              accountId={accountId} // Requirement 11.2: Pre-select account
              suggestedType={suggestedType} // Requirement 11.3: Suggest type
              onSuccess={async () => {
                // Requirement 11.4: Show updated difference
                setShowTransactionForm(false)
                // Refetch account difference to show updated value
                const result = await getAccountDifference(accountId)
                if (result.data) {
                  // Track if we just became reconciled
                  if (!accountBalance.is_reconciled && result.data.is_reconciled) {
                    setPreviousDifference(accountBalance.difference)
                  }
                  setAccountBalance(result.data)
                }
              }}
              onCancel={() => setShowTransactionForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ReconciliationStatusSkeleton
 * 
 * Loading skeleton for the ReconciliationStatus component
 */
export function ReconciliationStatusSkeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`flex items-center justify-end gap-2 animate-pulse ${className}`}
      role="status"
      aria-label="Loading reconciliation status"
    >
      <div className="text-right">
        <div className="w-16 h-3 bg-[var(--text-muted)] rounded opacity-20 mb-1" />
        <div className="w-20 h-4 bg-[var(--text-muted)] rounded opacity-20" />
      </div>
    </div>
  )
}
