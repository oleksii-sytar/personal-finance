/**
 * Account Reconciliation Panel for Transactions Page
 * Displays reconciliation status for all accounts while working with transactions
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react'
import { useReconciliationStatus } from '@/hooks/use-reconciliation-status'
import { useWorkspace } from '@/contexts/workspace-context'
import { formatCurrency } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { UpdateBalanceDialog } from '@/components/reconciliation/update-balance-dialog'
import type { AccountBalance } from '@/actions/balance-reconciliation'
import type { Account } from '@/actions/accounts'

interface AccountReconciliationPanelProps {
  className?: string
  defaultExpanded?: boolean
}

export function AccountReconciliationPanel({ 
  className,
  defaultExpanded = true 
}: AccountReconciliationPanelProps) {
  const { currentWorkspace } = useWorkspace()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  
  const { data: reconciliationStatus, isLoading } = useReconciliationStatus({
    workspaceId: currentWorkspace?.id || '',
    enabled: !!currentWorkspace?.id
  })

  if (!currentWorkspace) return null

  const hasUnreconciledAccounts = reconciliationStatus?.accounts.some(
    acc => !acc.is_reconciled
  ) ?? false

  const totalDifference = reconciliationStatus?.total_difference ?? 0
  const allReconciled = reconciliationStatus?.all_reconciled ?? false

  return (
    <>
      <div className={cn('bg-glass border border-glass rounded-xl overflow-hidden', className)}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-glass/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {allReconciled ? (
              <CheckCircle2 className="w-5 h-5 text-accent-success" />
            ) : (
              <AlertCircle className="w-5 h-5 text-accent-warning" />
            )}
            <div className="text-left">
              <h3 className="text-sm font-semibold text-primary">
                Account Reconciliation
              </h3>
              <p className="text-xs text-secondary">
                {allReconciled ? (
                  'All accounts reconciled'
                ) : (
                  <>
                    Total difference: {formatCurrency(
                      Math.abs(totalDifference),
                      reconciliationStatus?.total_difference_currency || 'UAH'
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!allReconciled && (
              <span className="px-2 py-1 bg-accent-warning/10 text-accent-warning rounded-full text-xs font-medium">
                {reconciliationStatus?.accounts.filter(a => !a.is_reconciled).length} need attention
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-secondary" />
            )}
          </div>
        </button>

        {/* Account List */}
        {isExpanded && (
          <div className="border-t border-glass">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-glass/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : reconciliationStatus?.accounts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-secondary text-sm">No accounts found</p>
                <p className="text-muted text-xs mt-1">
                  Create an account to start tracking balances
                </p>
              </div>
            ) : (
              <div className="divide-y divide-glass">
                {reconciliationStatus?.accounts.map((accountBalance) => (
                  <AccountReconciliationItem
                    key={accountBalance.account_id}
                    accountBalance={accountBalance}
                    onUpdateBalance={(account) => setSelectedAccount(account)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Update Balance Dialog */}
      {selectedAccount && (
        <UpdateBalanceDialog
          account={selectedAccount}
          isOpen={!!selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </>
  )
}

interface AccountReconciliationItemProps {
  accountBalance: AccountBalance
  onUpdateBalance: (account: Account) => void
}

function AccountReconciliationItem({ 
  accountBalance, 
  onUpdateBalance 
}: AccountReconciliationItemProps) {
  const { currentWorkspace } = useWorkspace()
  const [accountData, setAccountData] = useState<Account | null>(null)
  
  const isReconciled = accountBalance.is_reconciled
  const difference = accountBalance.difference
  const isPositive = difference > 0
  const isNegative = difference < 0

  // Fetch the actual account data to get the real name
  useEffect(() => {
    async function fetchAccount() {
      if (!currentWorkspace?.id) return
      
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountBalance.account_id)
        .single()
      
      if (data && !error) {
        setAccountData(data)
      }
    }
    
    fetchAccount()
  }, [accountBalance.account_id, currentWorkspace?.id])

  // Create account object for the dialog
  const account: Account = accountData || {
    id: accountBalance.account_id,
    workspace_id: currentWorkspace?.id || '',
    name: `Account ${accountBalance.account_id.slice(0, 8)}`,
    type: 'checking',
    currency: accountBalance.currency,
    opening_balance: accountBalance.opening_balance,
    current_balance: accountBalance.current_balance,
    current_balance_updated_at: null,
    initial_balance: accountBalance.opening_balance,
    is_default: false,
    created_at: '',
    updated_at: ''
  }

  return (
    <div className="p-3 hover:bg-glass/30 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-primary truncate">
              {account.name}
            </h4>
            {isReconciled && (
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-success flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted">Current: </span>
              <span className="text-secondary font-medium">
                {formatCurrency(accountBalance.current_balance, accountBalance.currency)}
              </span>
            </div>
            <div>
              <span className="text-muted">Calculated: </span>
              <span className="text-secondary font-medium">
                {formatCurrency(accountBalance.calculated_balance, accountBalance.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Difference Display */}
        <div className="flex items-center gap-2">
          {isReconciled ? (
            <>
              <div className="px-2 py-1 bg-accent-success/10 text-accent-success rounded-md text-xs font-medium">
                Reconciled
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdateBalance(account)}
                className="text-xs px-2 py-1 h-auto"
              >
                Update
              </Button>
            </>
          ) : (
            <>
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                isPositive && 'bg-accent-success/10 text-accent-success',
                isNegative && 'bg-accent-error/10 text-accent-error'
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {isPositive ? '+' : ''}{formatCurrency(difference, accountBalance.currency)}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdateBalance(account)}
                className="text-xs px-2 py-1 h-auto"
              >
                Update
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Difference Explanation */}
      {!isReconciled && (
        <div className="mt-2 text-xs text-muted">
          {isPositive ? (
            <>Missing income or extra expenses recorded</>
          ) : (
            <>Missing expenses or extra income recorded</>
          )}
        </div>
      )}
    </div>
  )
}
