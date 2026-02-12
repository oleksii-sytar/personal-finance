'use client'

/**
 * ReconciliationBadge Component
 * 
 * Displays the total reconciliation difference in the navigation/header area.
 * Shows "All Reconciled" when total difference is zero, or the difference amount
 * with warning styling when non-zero.
 * 
 * Requirements:
 * - 5.3: Display total difference prominently in navigation
 * - 5.4: Show success indicator when all accounts reconciled
 * - 5.5: Display amount with visual emphasis when non-zero
 * 
 * Design System:
 * - Uses Executive Lounge aesthetic with glass card styling
 * - Growth Emerald (#4E7A58) for success states
 * - Single Malt (#E6A65D) for warning states
 * - Warm colors and generous spacing
 */

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { getReconciliationStatus, type ReconciliationStatus } from '@/actions/balance-reconciliation'
import { formatCurrency } from '@/lib/utils/format'

interface ReconciliationBadgeProps {
  workspaceId: string
  className?: string
}

export function ReconciliationBadge({ workspaceId, className = '' }: ReconciliationBadgeProps) {
  const [status, setStatus] = useState<ReconciliationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      setIsLoading(true)
      setError(null)
      
      const result = await getReconciliationStatus(workspaceId)
      
      if (result.error) {
        // Handle error - convert to string if needed
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : 'Failed to fetch reconciliation status'
        setError(errorMessage)
        setIsLoading(false)
        return
      }
      
      if (result.data) {
        setStatus(result.data)
      }
      
      setIsLoading(false)
    }

    if (workspaceId) {
      fetchStatus()
    }
  }, [workspaceId])

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={`flex items-center gap-2 px-4 py-2 bg-[var(--bg-glass)] backdrop-blur-[16px] border border-[var(--border-glass)] rounded-full animate-pulse ${className}`}
        role="status"
        aria-label="Loading reconciliation status"
      >
        <div className="w-5 h-5 bg-[var(--text-muted)] rounded-full opacity-20" />
        <div className="w-24 h-4 bg-[var(--text-muted)] rounded opacity-20" />
      </div>
    )
  }

  // Error state
  if (error || !status) {
    return null // Silently fail - don't show badge if there's an error
  }

  // Success state - All Reconciled (Requirement 5.4)
  if (status.all_reconciled) {
    return (
      <div 
        className={`flex items-center gap-2 px-4 py-2 bg-[var(--accent-success)]/10 backdrop-blur-[16px] border border-[var(--accent-success)]/20 rounded-full transition-all duration-300 ${className}`}
        role="status"
        aria-label="All accounts reconciled"
      >
        <CheckCircle className="w-5 h-5 text-[var(--accent-success)]" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--accent-success)]">
          All Reconciled
        </span>
      </div>
    )
  }

  // Warning state - Non-zero difference (Requirement 5.5)
  const isPositive = status.total_difference > 0
  const formattedDifference = formatCurrency(
    Math.abs(status.total_difference),
    status.total_difference_currency
  )

  return (
    <div 
      className={`flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)]/10 backdrop-blur-[16px] border border-[var(--accent-primary)]/20 rounded-full transition-all duration-300 hover:bg-[var(--accent-primary)]/15 ${className}`}
      role="status"
      aria-label={`Reconciliation difference: ${isPositive ? '+' : '-'}${formattedDifference}`}
    >
      <AlertCircle className="w-5 h-5 text-[var(--accent-primary)]" aria-hidden="true" />
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          Difference:
        </span>
        <span className={`text-sm font-semibold ${
          isPositive 
            ? 'text-[var(--accent-success)]' 
            : 'text-[var(--accent-error)]'
        }`}>
          {isPositive ? '+' : '-'}{formattedDifference}
        </span>
      </div>
    </div>
  )
}

/**
 * ReconciliationBadgeSkeleton
 * 
 * Loading skeleton for the ReconciliationBadge component
 */
export function ReconciliationBadgeSkeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`flex items-center gap-2 px-4 py-2 bg-[var(--bg-glass)] backdrop-blur-[16px] border border-[var(--border-glass)] rounded-full animate-pulse ${className}`}
      role="status"
      aria-label="Loading reconciliation status"
    >
      <div className="w-5 h-5 bg-[var(--text-muted)] rounded-full opacity-20" />
      <div className="w-24 h-4 bg-[var(--text-muted)] rounded opacity-20" />
    </div>
  )
}
