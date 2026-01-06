/**
 * Demo component showing how to use TransactionList with infinite scroll and filtering
 * This demonstrates the implementation of Requirements 3.1-3.7 and 4.1-4.8
 */

'use client'

import { useCallback } from 'react'
import { TransactionList } from './transaction-list'
import { TransactionFilters } from './transaction-filters'
import { useInfiniteTransactions, useDeleteTransaction } from '@/hooks/use-transactions'
import { useTransactionFilters } from '@/contexts/transaction-filter-context'
import type { TransactionWithCategory } from '@/types/transactions'

interface TransactionListDemoProps {
  onEdit?: (transaction: TransactionWithCategory) => void
}

export function TransactionListDemo({ 
  onEdit 
}: TransactionListDemoProps) {
  const { filters } = useTransactionFilters()
  
  // Use infinite query for pagination and infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    error,
    isLoading
  } = useInfiniteTransactions(filters, 20)
  
  // Delete mutation
  const deleteTransaction = useDeleteTransaction()
  
  // Flatten all pages into a single array
  const transactions = data?.pages.flatMap(page => page.transactions) || []
  
  // Handle load more for infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  
  // Handle transaction deletion with confirmation
  const handleDelete = useCallback(async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync(transactionId)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      // In a real app, you'd show a toast notification here
    }
  }, [deleteTransaction])
  
  return (
    <div className="space-y-6">
      {/* Transaction Filters - Requirement 4.1-4.7 */}
      <TransactionFilters />
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary">Transactions</h2>
        <div className="text-sm text-muted">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Transaction list with infinite scroll */}
      <TransactionList
        transactions={transactions}
        onEdit={onEdit}
        onDelete={handleDelete}
        onLoadMore={handleLoadMore}
        hasMore={hasNextPage}
        isLoading={isLoading}
        isLoadingMore={isFetchingNextPage}
        error={error?.message || null}
        filters={filters}
        emptyMessage="No transactions yet"
        emptyDescription="Add your first transaction to get started tracking your finances"
      />
    </div>
  )
}

/**
 * Simple wrapper for basic transaction list usage
 */
export function SimpleTransactionList({ 
  transactions,
  onEdit,
  onDelete 
}: {
  transactions: TransactionWithCategory[]
  onEdit?: (transaction: TransactionWithCategory) => void
  onDelete?: (transactionId: string) => void
}) {
  return (
    <TransactionList
      transactions={transactions}
      onEdit={onEdit}
      onDelete={onDelete}
      hasMore={false}
      isLoading={false}
      isLoadingMore={false}
    />
  )
}