'use client'

import { IntegratedTransactionSystem } from '@/components/transactions'
import { AccountReconciliationPanel } from '@/components/transactions/account-reconciliation-panel'
import { WorkspaceGate } from '@/components/shared/workspace-gate'
import { AccountRequirementGate } from '@/components/shared/account-requirement-gate'
import { TransactionErrorBoundary } from '@/components/shared/transaction-error-boundary'
import { Receipt, TrendingUp, Calendar } from 'lucide-react'

/**
 * TransactionsPage - Main transaction management page
 * 
 * Requirements: AC 2.1.1, AC 2.2.2 - Transactions page requires workspace AND at least one account
 * 
 * Access Control:
 * 1. WorkspaceGate: Checks for workspace (shows creation prompt if missing)
 * 2. AccountRequirementGate: Checks for at least one account (shows account creation prompt if missing)
 * 3. Only shows transaction system when both requirements are met
 */
export default function TransactionsPage() {
  return (
    <WorkspaceGate
      featureName="Transaction Management"
      description="You need to create a workspace before you can manage transactions. A workspace is your family's shared financial space."
      benefits={[
        {
          icon: <Receipt className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
          text: 'Track all your income and expenses in one place'
        },
        {
          icon: <TrendingUp className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
          text: 'See your financial forecast and upcoming payments'
        },
        {
          icon: <Calendar className="w-5 h-5 text-[var(--text-secondary)] opacity-60" />,
          text: 'Plan future transactions and avoid surprises'
        }
      ]}
    >
      <AccountRequirementGate
        featureName="Transaction Management"
        description="Track your family's income and expenses"
      >
        <TransactionErrorBoundary>
          <div className="container mx-auto py-4 lg:py-6 space-y-4 lg:space-y-6">
            {/* Account Reconciliation Panel - Key Feature */}
            <AccountReconciliationPanel defaultExpanded={true} />
            
            {/* Transaction Management System */}
            <IntegratedTransactionSystem 
              enableVirtualization={true}
              showFloatingButton={true}
              showFilters={true}
            />
          </div>
        </TransactionErrorBoundary>
      </AccountRequirementGate>
    </WorkspaceGate>
  )
}