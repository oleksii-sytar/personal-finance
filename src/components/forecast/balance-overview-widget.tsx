/**
 * Balance Overview Widget Component
 * 
 * Displays total balance across all accounts with account-level breakdown
 * and reconciliation status indicators.
 * 
 * Implements Requirements 2.7: Balance Overview Widget
 * 
 * Features:
 * - Shows total balance across all accounts
 * - Account-level breakdown with reconciliation status
 * - Visual indicators for accounts needing reconciliation
 * - Quick link to reconcile accounts
 * - Debt vs. Asset separation
 * - Loading and error states
 * - Empty state handling
 * 
 * @module components/forecast/balance-overview-widget
 */

'use client'

import { useMemo } from 'react'
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, ExternalLink, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HelpIcon } from '@/components/ui/help-icon'
import { EmptyStateWithAction } from '@/components/shared/empty-state-with-action'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { HELP_TEXT } from '@/lib/constants/help-text'
import type { Account } from '@/types'
import type { AccountBalance } from '@/actions/balance-reconciliation'

interface BalanceOverviewWidgetProps {
  /** Array of accounts to display */
  accounts: Account[]
  /** Array of account balances with reconciliation status */
  accountBalances?: AccountBalance[]
  /** Currency code (e.g., 'UAH', 'USD') */
  currency: string
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
  /** Show reconciliation link */
  showReconciliationLink?: boolean
}

/**
 * Account row component with reconciliation status
 */
function AccountRow({ 
  account, 
  accountBalance 
}: { 
  account: Account
  accountBalance?: AccountBalance 
}) {
  const isReconciled = accountBalance?.is_reconciled ?? true
  const difference = accountBalance?.difference ?? 0
  const isDebt = account.current_balance < 0

  return (
    <div className="flex items-center justify-between py-3 border-b border-primary/10 last:border-0">
      {/* Account Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-primary truncate">
            {account.name}
          </span>
          
          {/* Reconciliation Status Indicator */}
          {isReconciled ? (
            <CheckCircle 
              className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0" 
              aria-label="Reconciled"
            />
          ) : (
            <AlertCircle 
              className="w-4 h-4 text-amber-500 flex-shrink-0" 
              aria-label="Needs reconciliation"
            />
          )}
        </div>
        
        {/* Account Type Badge */}
        <span className="text-xs text-secondary capitalize">
          {account.type}
        </span>
        
        {/* Reconciliation Difference (if not reconciled) */}
        {!isReconciled && accountBalance && (
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Difference: {difference > 0 ? '+' : ''}{formatCurrency(Math.abs(difference), account.currency)}
          </div>
        )}
      </div>

      {/* Balance */}
      <div className="text-right ml-4">
        <p className={cn(
          'font-semibold font-space-grotesk',
          isDebt ? 'text-red-500' : 'text-primary'
        )}>
          {formatCurrency(account.current_balance, account.currency)}
        </p>
      </div>
    </div>
  )
}

/**
 * Empty state component with guidance and action
 */
function EmptyState() {
  return (
    <EmptyStateWithAction
      icon={Wallet}
      title="No Accounts Yet"
      description="Create your first account to start tracking your family's finances and see your balance overview."
      guidance="Accounts help you organize your money - like checking accounts, savings, or cash. You'll need at least one account to add transactions."
      action={{
        label: "Create First Account",
        href: "/accounts"
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
      {/* Total Balance Skeleton */}
      <div className="animate-pulse">
        <div className="h-4 bg-primary/10 rounded w-24 mb-2" />
        <div className="h-8 bg-primary/10 rounded w-40 mb-4" />
      </div>
      
      {/* Account Rows Skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between py-3 border-b border-primary/10 animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-primary/10 rounded w-32" />
            <div className="h-3 bg-primary/10 rounded w-20" />
          </div>
          <div className="h-5 bg-primary/10 rounded w-24" />
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
 * Balance Overview Widget
 * 
 * Main component that displays total balance and account breakdown.
 */
export function BalanceOverviewWidget({
  accounts,
  accountBalances = [],
  currency,
  isLoading = false,
  error,
  showReconciliationLink = true,
}: BalanceOverviewWidgetProps) {
  // Calculate summary statistics
  const summary = useMemo(() => {
    // Total balance across all accounts
    const totalBalance = accounts.reduce((sum, account) => sum + account.current_balance, 0)
    
    // Separate assets (positive balance) and debts (negative balance)
    const assets = accounts.filter(a => a.current_balance >= 0)
    const debts = accounts.filter(a => a.current_balance < 0)
    
    const totalAssets = assets.reduce((sum, a) => sum + a.current_balance, 0)
    const totalDebts = Math.abs(debts.reduce((sum, a) => sum + a.current_balance, 0))
    
    // Count accounts needing reconciliation
    const needsReconciliation = accountBalances.filter(ab => !ab.is_reconciled).length
    
    // Check if all accounts are reconciled
    const allReconciled = accountBalances.length > 0 && 
      accountBalances.every(ab => ab.is_reconciled)
    
    return {
      totalBalance,
      totalAssets,
      totalDebts,
      assetsCount: assets.length,
      debtsCount: debts.length,
      needsReconciliation,
      allReconciled,
    }
  }, [accounts, accountBalances])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Balance Overview</CardTitle>
            <HelpIcon content={HELP_TEXT.BALANCE_OVERVIEW.content} />
          </div>
          
          {/* Reconciliation Status Badge */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-2">
              {summary.allReconciled ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-[var(--accent-success)]/10 text-[var(--accent-success)] text-xs font-medium rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  All Reconciled
                </span>
              ) : summary.needsReconciliation > 0 ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {summary.needsReconciliation} Need{summary.needsReconciliation === 1 ? 's' : ''} Reconciliation
                </span>
              ) : null}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && !isLoading && <ErrorState message={error} />}

          {/* Empty State */}
          {!isLoading && !error && accounts.length === 0 && <EmptyState />}

          {/* Balance Summary */}
          {!isLoading && !error && accounts.length > 0 && (
            <>
              {/* Total Balance */}
              <div className="p-4 bg-glass rounded-lg border border-primary/10">
                <p className="text-sm text-secondary mb-1">Total Balance</p>
                <p className="text-3xl font-bold text-primary font-space-grotesk">
                  {formatCurrency(summary.totalBalance, currency)}
                </p>
                
                {/* Assets vs Debts Breakdown */}
                {(summary.totalAssets > 0 || summary.totalDebts > 0) && (
                  <div className="mt-3 pt-3 border-t border-primary/10 grid grid-cols-2 gap-4">
                    {/* Assets */}
                    {summary.totalAssets > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-secondary mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Assets ({summary.assetsCount})</span>
                        </div>
                        <p className="text-sm font-semibold text-[var(--accent-success)] font-space-grotesk">
                          {formatCurrency(summary.totalAssets, currency)}
                        </p>
                      </div>
                    )}
                    
                    {/* Debts */}
                    {summary.totalDebts > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-xs text-secondary mb-1">
                          <TrendingDown className="w-3 h-3" />
                          <span>Debts ({summary.debtsCount})</span>
                        </div>
                        <p className="text-sm font-semibold text-red-500 font-space-grotesk">
                          {formatCurrency(summary.totalDebts, currency)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account List */}
              <div>
                <h3 className="text-sm font-medium text-secondary mb-3">
                  Accounts ({accounts.length})
                </h3>
                <div className="space-y-0">
                  {accounts.map((account) => {
                    const accountBalance = accountBalances.find(
                      ab => ab.account_id === account.id
                    )
                    return (
                      <AccountRow
                        key={account.id}
                        account={account}
                        accountBalance={accountBalance}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Reconciliation Link */}
              {showReconciliationLink && summary.needsReconciliation > 0 && (
                <div className="pt-3 border-t border-primary/10">
                  <Link href="/accounts" passHref>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <span>Reconcile Accounts</span>
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
