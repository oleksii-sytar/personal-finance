/**
 * Virtualized Transaction List for performance optimization with large datasets
 * Currently simplified to use regular list - virtualization can be added later
 */

'use client'

import { TransactionList } from './transaction-list'
import type { TransactionWithCategory, TransactionFilters } from '@/types/transactions'

interface VirtualizedTransactionListProps {
  transactions: TransactionWithCategory[]
  onEdit?: (transaction: TransactionWithCategory) => void
  onDelete?: (transactionId: string) => void
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  error?: string | null
  filters?: TransactionFilters
  className?: string
  emptyMessage?: string
  emptyDescription?: string
  itemHeight?: number
  height?: number
  overscan?: number
}

/**
 * Simplified virtualized list that falls back to regular TransactionList
 * TODO: Implement proper virtualization when react-window types are resolved
 */
export function VirtualizedTransactionList({
  transactions,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  className,
  emptyMessage = 'No transactions found',
  emptyDescription = 'Start by adding your first transaction',
  ...rest
}: VirtualizedTransactionListProps) {
  // For now, use the regular TransactionList
  // This ensures the integration works while we can optimize virtualization later
  return (
    <TransactionList
      transactions={transactions}
      onEdit={onEdit}
      onDelete={onDelete}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      isLoadingMore={isLoadingMore}
      error={error}
      className={className}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
    />
  )
}