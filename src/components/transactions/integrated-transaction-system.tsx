/**
 * Integrated Transaction System - Complete transaction management with all features
 * This component wires together all transaction components with performance optimizations,
 * responsive design, error handling, and loading states
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { Plus, Filter, Search, X, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useUndoToast } from '@/components/ui/undo-toast'
import { TransactionList } from './transaction-list'
import { VirtualizedTransactionList } from './virtualized-transaction-list'
import { TransactionEditModal } from './transaction-edit-modal'
import { DetailedEntryForm } from './detailed-entry-form'
import { TransactionFilters } from './transaction-filters'
import { CheckpointTimelineView } from './checkpoint-timeline-view'
import { CheckpointCreationButton } from './checkpoint-creation-button'
import { EnhancedLoadingState, TransactionErrorBoundary } from '@/components/shared'
import { deleteTransaction, restoreTransaction } from '@/actions/transactions'
import { useDeleteTransaction } from '@/hooks/use-transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import { useFilterContext } from '@/contexts/transaction-filter-context'
import { useTransactions } from '@/hooks/use-transactions'
import { useTransactionPerformance } from '@/hooks/use-transaction-performance'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

interface IntegratedTransactionSystemProps {
  initialTransactions?: TransactionWithCategory[]
  className?: string
  enableVirtualization?: boolean
  showFloatingButton?: boolean
  showFilters?: boolean
}

/**
 * Complete transaction management system with all features integrated
 * Implements all requirements from the transactions spec
 */
export function IntegratedTransactionSystem({
  initialTransactions = [],
  className,
  enableVirtualization = true,
  showFloatingButton = true,
  showFilters = true
}: IntegratedTransactionSystemProps) {
  const { currentWorkspace } = useWorkspace()
  const filterContext = useFilterContext()
  const { showUndoToast } = useUndoToast()
  const router = useRouter()
  
  // React Query mutations
  const deleteTransactionMutation = useDeleteTransaction()
  
  // Memoize filters to prevent infinite re-renders
  const memoizedFilters = useMemo(() => {
    if (!filterContext?.activeFilters) return undefined
    return filterContext.activeFilters
  }, [filterContext?.activeFilters])

  // Fetch transactions using the hook
  const { 
    data: fetchedTransactions = [], 
    isLoading: isFetchingTransactions, 
    error: fetchError 
  } = useTransactions({
    categories: memoizedFilters?.categories,
    type: memoizedFilters?.type === 'all' ? undefined : memoizedFilters?.type,
    startDate: memoizedFilters?.dateRange?.start,
    endDate: memoizedFilters?.dateRange?.end
  })

  // Use fetched transactions directly instead of local state
  const transactions = fetchedTransactions
  const isLoading = isFetchingTransactions
  const error = fetchError?.message || null
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  
  // Timeline refresh state
  const [timelineKey, setTimelineKey] = useState(0)
  
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    transactionId: string | null
    transactionDescription: string
  }>({
    isOpen: false,
    transactionId: null,
    transactionDescription: ''
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // Performance optimization hook
  const {
    filteredTransactions,
    isFiltering,
    shouldUseVirtualization,
    paginatedTransactions,
    hasMore,
    loadMore,
    searchStats
  } = useTransactionPerformance({
    transactions,
    searchQuery,
    filters: memoizedFilters,
    enableVirtualization,
    virtualizationThreshold: 100
  })

  // Handle transaction edit (Requirement 5.1: Allow editing of all transaction fields)
  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    setEditingTransaction(transaction)
  }

  // Handle edit success (Requirement 5.3: Update transaction and return to list)
  const handleEditSuccess = (updatedTransaction: TransactionWithCategory) => {
    // The query will automatically refetch and update the data
    setEditingTransaction(null)
    // Refresh timeline to show updated gap calculations
    setTimelineKey(prev => prev + 1)
  }

  // Handle transaction creation success
  const handleCreateSuccess = (newTransaction: TransactionWithCategory) => {
    // The query will automatically refetch and update the data
    setShowCreateForm(false)
    // Refresh timeline to show updated gap calculations
    setTimelineKey(prev => prev + 1)
  }

  // Handle delete initiation (Requirement 6.1: Require confirmation)
  const handleDeleteTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    setDeleteConfirmation({
      isOpen: true,
      transactionId,
      transactionDescription: transaction.description || 'Untitled transaction'
    })
  }

  // Handle delete confirmation (Requirements 6.1, 6.2, 6.3, 6.4)
  const handleConfirmDelete = async () => {
    const { transactionId, transactionDescription } = deleteConfirmation
    if (!transactionId) return

    setIsDeleting(true)

    try {
      const result = await deleteTransactionMutation.mutateAsync(transactionId)
      
      if (result.error) {
        console.error('Delete transaction error:', result.error)
        return
      }

      // Store the deleted transaction for potential undo
      const deletedTransaction = transactions.find(t => t.id === transactionId)
      
      // Close confirmation dialog
      setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' })
      
      // Refresh timeline to show updated gap calculations
      setTimelineKey(prev => prev + 1)
      
      // Show undo toast (Requirement 6.3: 10-second undo option)
      if (deletedTransaction) {
        showUndoToast({
          title: 'Transaction deleted',
          description: `"${transactionDescription}" has been deleted`,
          onUndo: async () => {
            try {
              const restoreResult = await restoreTransaction(transactionId)
              if (restoreResult.error) {
                console.error('Restore transaction error:', restoreResult.error)
                return
              }
              
              // The query will automatically refetch and show the restored transaction
              // Refresh timeline to show updated gap calculations
              setTimelineKey(prev => prev + 1)
            } catch (err) {
              console.error('Undo delete error:', err)
            }
          },
          duration: 10000 // 10 seconds as per Requirement 6.3
        })
      }
      
    } catch (err) {
      console.error('Delete transaction error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' })
  }

  // Handle filter changes
  const handleClearSearch = () => {
    setSearchQuery('')
  }

  // Handle checkpoint creation success
  const handleCheckpointCreated = () => {
    // Refresh the timeline by updating the key
    setTimelineKey(prev => prev + 1)
  }

  // Determine which list component to use
  const ListComponent = shouldUseVirtualization ? VirtualizedTransactionList : TransactionList
  const listTransactions = shouldUseVirtualization ? filteredTransactions : paginatedTransactions

  return (
    <TransactionErrorBoundary>
      <div className={cn('space-y-4 lg:space-y-6', className)}>
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">Transactions</h1>
              {searchStats.isSearchActive && (
                <span className="px-2 py-1 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-full text-xs font-medium">
                  {searchStats.filtered} of {searchStats.total}
                </span>
              )}
            </div>
            <p className="text-secondary">
              Manage your income and expenses
              {isFiltering && <span className="ml-2 text-xs">(Filtering...)</span>}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {currentWorkspace && (
              <CheckpointCreationButton
                workspaceId={currentWorkspace.id}
                onCheckpointCreated={handleCheckpointCreated}
                className="hidden sm:flex"
              />
            )}
            
            <Button
              variant="secondary"
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </Button>
            
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 w-full sm:w-auto"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add Transaction</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          {showFilters && (
            <Button
              variant="secondary"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilterPanel && <span className="text-sm opacity-75">(Active)</span>}
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilterPanel && showFilters && (
          <Suspense fallback={<EnhancedLoadingState variant="skeleton" />}>
            <div className="p-4 bg-glass border border-glass rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilterPanel(false)}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <TransactionFilters />
            </div>
          </Suspense>
        )}

        {/* Performance indicator for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted bg-glass p-2 rounded border border-glass">
            Performance: {shouldUseVirtualization ? 'Virtualized' : 'Paginated'} | 
            Items: {listTransactions.length} | 
            Filtering: {isFiltering ? 'Yes' : 'No'}
          </div>
        )}

        {/* Checkpoint Timeline */}
        {currentWorkspace && (
          <Suspense fallback={<EnhancedLoadingState variant="skeleton" />}>
            <CheckpointTimelineView 
              key={timelineKey}
              workspaceId={currentWorkspace.id}
              className="mb-4 lg:mb-6"
            />
          </Suspense>
        )}

        {/* Loading State */}
        {isLoading && transactions.length === 0 && (
          <EnhancedLoadingState 
            variant="shimmer" 
            message="Loading your transactions..."
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-red-500 font-medium text-sm">
                  Failed to load transactions
                </p>
                <p className="text-red-400 text-xs mt-1">
                  {error}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-red-500 hover:bg-red-500/10"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <ListComponent
          transactions={listTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          onLoadMore={shouldUseVirtualization ? undefined : loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
          isLoadingMore={isFiltering}
          error={error}
          emptyMessage="No transactions found"
          emptyDescription={searchQuery 
            ? "Try adjusting your search terms or clear the search to see all transactions"
            : "Start by adding your first transaction to track your finances"
          }
          height={shouldUseVirtualization ? 600 : undefined}
        />

        {/* Floating Add Button for Mobile */}
        {showFloatingButton && !showCreateForm && (
          <div className="sm:hidden">
            <button
              onClick={() => setShowCreateForm(true)}
              className="
                fixed bottom-6 right-6 z-50
                w-14 h-14 
                bg-gradient-to-br from-accent-primary to-accent-primary
                hover:from-accent-primary hover:to-accent-secondary
                text-inverse
                rounded-full
                shadow-lg hover:shadow-xl
                transition-all duration-200
                flex items-center justify-center
                text-2xl font-light
                hover:scale-105
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:ring-offset-2
              "
              aria-label="Add new transaction"
              title="Add new transaction"
            >
              +
            </button>
            
            {/* Mobile Checkpoint Button */}
            {currentWorkspace && (
              <CheckpointCreationButton
                workspaceId={currentWorkspace.id}
                onCheckpointCreated={handleCheckpointCreated}
                className="fixed bottom-6 left-6 z-50 sm:hidden"
                variant="floating"
              />
            )}
          </div>
        )}

        {/* Create Transaction Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full sm:w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto bg-primary border-0 sm:border border-glass rounded-none sm:rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-glass">
                <h2 className="text-lg sm:text-xl font-semibold text-primary">
                  New Transaction
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-glass rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 sm:p-6">
                <DetailedEntryForm
                  onSuccess={handleCreateSuccess}
                  onCancel={() => setShowCreateForm(false)}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {editingTransaction && (
          <TransactionEditModal
            transaction={editingTransaction}
            isOpen={!!editingTransaction}
            onClose={() => setEditingTransaction(null)}
            onSuccess={handleEditSuccess}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={deleteConfirmation.isOpen}
          title="Delete Transaction"
          message={`Are you sure you want to delete "${deleteConfirmation.transactionDescription}"? You can undo this action within 10 seconds.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
          variant="danger"
        />
      </div>
    </TransactionErrorBoundary>
  )
}