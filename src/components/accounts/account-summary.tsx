/**
 * AccountSummary Component
 * 
 * Displays aggregate statistics across all accounts in a workspace.
 * Features Executive Lounge styling with glass card effects and warm colors.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

'use client'

import type { Account, AccountType } from '@/types'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Plus, AlertCircle } from 'lucide-react'
import { useMemo } from 'react'

export interface AccountSummaryProps {
  /**
   * Array of accounts to summarize
   */
  accounts: Account[]
  
  /**
   * Callback when "Add Account" button is clicked
   */
  onAddAccount?: () => void
  
  /**
   * Optional additional CSS classes
   */
  className?: string
}

/**
 * AccountSummary component displays aggregate statistics:
 * - Total balance across all accounts
 * - Account count by type (e.g., "2 Checking, 1 Savings")
 * - Debt indicator (accounts with negative balances)
 * - Quick "Add Account" action button
 * 
 * Design Features:
 * - Glass card styling with Executive Lounge aesthetic
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 * - Accessibility-compliant touch targets (min 44px)
 * - Clear visual hierarchy with typography
 * 
 * @example
 * <AccountSummary 
 *   accounts={accounts} 
 *   onAddAccount={() => handleAddAccount()}
 * />
 */
export function AccountSummary({ 
  accounts, 
  onAddAccount, 
  className 
}: AccountSummaryProps) {
  // Calculate aggregate statistics
  const statistics = useMemo(() => {
    // Calculate total balance (sum of all account balances)
    const totalBalance = accounts.reduce((sum, account) => sum + account.current_balance, 0)
    
    // Count accounts by type
    const accountCounts: Record<AccountType, number> = {
      checking: 0,
      savings: 0,
      credit: 0,
      investment: 0,
    }
    
    accounts.forEach(account => {
      accountCounts[account.type]++
    })
    
    // Identify accounts with negative balances (debt)
    const debtAccounts = accounts.filter(account => account.current_balance < 0)
    
    // Get currency from first account (all accounts in workspace share same currency)
    const currency = accounts[0]?.currency || 'UAH'
    
    return {
      totalBalance,
      accountCounts,
      debtAccounts,
      currency,
      totalAccounts: accounts.length,
    }
  }, [accounts])
  
  // Format account type summary (e.g., "2 Checking, 1 Savings")
  const accountTypeSummary = useMemo(() => {
    const parts: string[] = []
    
    const typeLabels: Record<AccountType, string> = {
      checking: 'Checking',
      savings: 'Savings',
      credit: 'Credit',
      investment: 'Investment',
    }
    
    Object.entries(statistics.accountCounts).forEach(([type, count]) => {
      if (count > 0) {
        parts.push(`${count} ${typeLabels[type as AccountType]}`)
      }
    })
    
    return parts.length > 0 ? parts.join(', ') : 'No accounts'
  }, [statistics.accountCounts])
  
  // Format total balance with currency
  const formattedTotalBalance = formatCurrency(
    statistics.totalBalance, 
    statistics.currency
  )
  
  return (
    <div
      className={cn(
        // Glass card with Executive Lounge styling
        'bg-glass backdrop-blur-[16px]',
        'border border-glass',
        'rounded-[20px]',
        'p-6',
        // Smooth transitions
        'transition-all duration-300 ease-out',
        className
      )}
      role="region"
      aria-label="Account summary"
    >
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Summary Statistics */}
        <div className="flex-1">
          {/* Total Balance Label */}
          <h2 
            className={cn(
              'text-sm font-medium text-secondary',
              'uppercase tracking-wide',
              'mb-1'
            )}
          >
            Total Balance
          </h2>
          
          {/* Total Balance Amount */}
          <p 
            className={cn(
              'text-3xl md:text-4xl font-bold',
              'font-[family-name:var(--font-space-grotesk)]',
              'tracking-tight',
              'text-primary',
              'mb-2'
            )}
            aria-label={`Total balance: ${formattedTotalBalance}`}
          >
            {formattedTotalBalance}
          </p>
          
          {/* Account Type Summary */}
          <p 
            className={cn(
              'text-sm text-secondary',
              'font-medium'
            )}
            aria-label={`Account breakdown: ${accountTypeSummary}`}
          >
            {accountTypeSummary}
          </p>
        </div>
        
        {/* Add Account Button */}
        {onAddAccount && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddAccount}
            className={cn(
              'shrink-0',
              'h-10 w-10 md:h-12 md:w-12',
              'p-0',
              'rounded-full'
            )}
            aria-label="Add new account"
          >
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      {/* Debt Indicator (if any accounts have negative balance) */}
      {statistics.debtAccounts.length > 0 && (
        <div 
          className={cn(
            'mt-4 p-3',
            'bg-accent-error/10',
            'border border-accent-error/20',
            'rounded-lg',
            'flex items-start gap-3'
          )}
          role="alert"
          aria-live="polite"
        >
          <AlertCircle 
            className="w-5 h-5 text-accent-error shrink-0 mt-0.5" 
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-sm text-accent-error font-medium">
              {statistics.debtAccounts.length === 1
                ? 'You have 1 account with a negative balance'
                : `You have ${statistics.debtAccounts.length} accounts with negative balances`}
            </p>
            {/* List debt accounts */}
            <ul className="mt-2 space-y-1">
              {statistics.debtAccounts.map(account => (
                <li 
                  key={account.id}
                  className="text-xs text-accent-error/80"
                >
                  {account.name}: {formatCurrency(account.current_balance, account.currency)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Empty State (no accounts) */}
      {statistics.totalAccounts === 0 && (
        <div 
          className={cn(
            'mt-4 p-4',
            'bg-glass',
            'border border-glass',
            'rounded-lg',
            'text-center'
          )}
        >
          <p className="text-sm text-secondary">
            No accounts yet. Add your first account to get started.
          </p>
        </div>
      )}
    </div>
  )
}
