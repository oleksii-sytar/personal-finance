/**
 * Upcoming Payments Widget Component
 * 
 * Displays upcoming planned transactions with risk indicators and quick actions.
 * Implements Requirements 2.6: Upcoming Payments & Risks Widget
 * 
 * Features:
 * - Shows upcoming planned transactions (next 30 days)
 * - Risk indicators (🟢 Green, 🟡 Yellow, 🔴 Red)
 * - "Mark as Paid" quick action buttons
 * - Summary totals (7-day, 30-day)
 * - Loading and error states
 * - Empty state handling
 * 
 * @module components/forecast/upcoming-payments-widget
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle, AlertCircle, Calendar, CalendarPlus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MarkAsPaidButton } from '@/components/transactions/mark-as-paid-button'
import { EmptyStateWithAction } from '@/components/shared/empty-state-with-action'
import { formatCurrency } from '@/lib/utils'
import type { PaymentRisk } from '@/lib/calculations/payment-risk-assessment'

interface UpcomingPaymentsWidgetProps {
  /** Array of payment risks to display */
  paymentRisks: PaymentRisk[]
  /** Currency code (e.g., 'UAH', 'USD') */
  currency: string
  /** Callback when a payment is marked as paid */
  onPaymentMarked?: () => void
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
  /** Maximum number of payments to display (default: 10) */
  maxDisplay?: number
}

/**
 * Risk indicator icon component
 */
function RiskIndicator({ level }: { level: 'safe' | 'warning' | 'danger' }) {
  const config = {
    safe: {
      icon: CheckCircle,
      color: 'text-[var(--accent-success)]',
      label: 'Safe',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-amber-500',
      label: 'Warning',
    },
    danger: {
      icon: AlertTriangle,
      color: 'text-red-500',
      label: 'Risk',
    },
  }

  const { icon: Icon, color, label } = config[level]

  return (
    <Icon 
      className={`w-4 h-4 ${color}`} 
      aria-label={`${label} risk level`}
    />
  )
}

/**
 * Empty state component with guidance and action
 */
function EmptyState() {
  return (
    <EmptyStateWithAction
      icon={CalendarPlus}
      title="No Upcoming Payments"
      description="Schedule future transactions to see them here with risk indicators and payment reminders."
      guidance="Add planned transactions with future dates to track upcoming bills, subscriptions, and expenses. This helps you avoid payment surprises."
      action={{
        label: "Add Planned Transaction",
        href: "/transactions"
      }}
    />
  )
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-3 bg-glass rounded-lg border border-primary/10 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/10 rounded w-3/4" />
              <div className="h-3 bg-primary/10 rounded w-1/2" />
            </div>
            <div className="h-8 w-24 bg-primary/10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-sm text-red-600 dark:text-red-400">
        ⚠️ {message}
      </p>
    </div>
  )
}

/**
 * Upcoming Payments Widget
 * 
 * Main component that displays upcoming planned transactions with risk assessment.
 */
export function UpcomingPaymentsWidget({
  paymentRisks,
  currency,
  onPaymentMarked,
  isLoading = false,
  error,
  maxDisplay = 10,
}: UpcomingPaymentsWidgetProps) {
  const [markingId, setMarkingId] = useState<string | null>(null)

  // Calculate summary totals
  const next7Days = paymentRisks
    .filter((r) => r.daysUntil <= 7)
    .reduce((sum, r) => sum + r.transaction.amount, 0)

  const next30Days = paymentRisks.reduce(
    (sum, r) => sum + r.transaction.amount,
    0
  )

  // Count high-risk payments
  const highRiskCount = paymentRisks.filter(
    (r) => r.riskLevel === 'danger'
  ).length

  /**
   * Handle marking a payment as paid
   */
  const handleMarkAsPaid = async (transactionId: string) => {
    setMarkingId(transactionId)

    try {
      // The MarkAsPaidButton component handles the actual action
      // This is just for tracking loading state
      if (onPaymentMarked) {
        await new Promise((resolve) => setTimeout(resolve, 100)) // Small delay for UX
        onPaymentMarked()
      }
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Payments</CardTitle>
          {highRiskCount > 0 && (
            <span
              className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded-full"
              role="status"
              aria-live="polite"
            >
              {highRiskCount} at risk
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Summary Totals */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-glass rounded-lg border border-primary/10">
            <div>
              <p className="text-xs text-secondary mb-1">Next 7 Days</p>
              <p className="text-lg font-semibold text-primary font-space-grotesk">
                {formatCurrency(next7Days, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-secondary mb-1">Next 30 Days</p>
              <p className="text-lg font-semibold text-primary font-space-grotesk">
                {formatCurrency(next30Days, currency)}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && !isLoading && <ErrorState message={error} />}

          {/* Empty State */}
          {!isLoading && !error && paymentRisks.length === 0 && <EmptyState />}

          {/* Payment List */}
          {!isLoading && !error && paymentRisks.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {paymentRisks.slice(0, maxDisplay).map((risk) => (
                <div
                  key={risk.transaction.id}
                  className="p-3 bg-glass rounded-lg border border-primary/10 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Payment Info */}
                    <div className="flex-1 min-w-0">
                      {/* Title with Risk Indicator */}
                      <div className="flex items-center gap-2 mb-1">
                        <RiskIndicator level={risk.riskLevel} />
                        <span className="font-medium text-primary truncate">
                          {risk.transaction.description}
                        </span>
                      </div>

                      {/* Amount and Days Until */}
                      <div className="flex items-center gap-3 text-sm mb-1">
                        <span className="text-primary font-semibold font-space-grotesk">
                          {formatCurrency(risk.transaction.amount, currency)}
                        </span>
                        <span className="text-secondary">
                          in {risk.daysUntil} {risk.daysUntil === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      {/* Recommendation */}
                      <p className="text-xs text-secondary line-clamp-2">
                        {risk.recommendation}
                      </p>
                    </div>

                    {/* Mark as Paid Button */}
                    <div className="flex-shrink-0">
                      <MarkAsPaidButton
                        transactionId={risk.transaction.id}
                        onMarkAsPaid={handleMarkAsPaid}
                        variant="compact"
                        disabled={markingId === risk.transaction.id}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Show more indicator */}
              {paymentRisks.length > maxDisplay && (
                <p className="text-xs text-center text-secondary py-2">
                  Showing {maxDisplay} of {paymentRisks.length} upcoming payments
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
