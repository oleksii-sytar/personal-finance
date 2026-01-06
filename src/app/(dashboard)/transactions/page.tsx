'use client'

import { IntegratedTransactionSystem } from '@/components/transactions'
import { FeatureGate } from '@/components/shared/feature-gate'
import { TransactionErrorBoundary } from '@/components/shared/transaction-error-boundary'

export default function TransactionsPage() {
  return (
    <FeatureGate
      featureName="Transaction Management"
      description="Track your family's income and expenses with our intuitive transaction management system."
    >
      <TransactionErrorBoundary>
        <div className="container mx-auto py-4 lg:py-6">
          <IntegratedTransactionSystem 
            enableVirtualization={true}
            showFloatingButton={true}
            showFilters={true}
          />
        </div>
      </TransactionErrorBoundary>
    </FeatureGate>
  )
}