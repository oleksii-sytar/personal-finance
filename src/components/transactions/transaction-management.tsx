'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useUndoToast } from '@/components/ui/undo-toast'
import { TransactionList } from './transaction-list'
import { TransactionEditModal } from './transaction-edit-modal'
import { DetailedEntryForm } from './detailed-entry-form'
import { deleteTransaction, restoreTransaction } from '@/actions/transactions'
import { useDeleteTransaction } from '@/hooks/use-transactions'
import { useWorkspace } from '@/contexts/workspace-context'
import { useFilterContext } from '@/contexts/transaction-filter-context'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory } from '@/types/transactions'

interface TransactionManagementProps {
  initialTransactions?: TransactionWithCategory[]
  className?: string
}

/**
 * TransactionManagement component - Main transaction management interface
 * Implements Requirements 5.1, 5.2, 5.3: Complete transaction editing functionality
 * Implements Requirements 3.6: Tap-to-edit functionality
 * Implements Requirements 6.1, 6.2: Delete with confirmation
 */
export function TransactionManagement({
  initialTransactions = [],
  className
}: TransactionManagementProps) {
  const { currentWorkspace } = useWorkspace()
  const filterContext = useFilterContext()
  const { showUndoToast } = useUndoToast()
  
  // React Query mutations
  const deleteTransactionMutation = useDeleteTransaction()
  
  // State management
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(initialTransactions)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
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

  // Load transactions using the existing hook
  const loadTransactions = useCallback(async () => {
    if (!currentWorkspace?.id) return

    setIsLoading(true)
    setError(null)

    try {
      // Use initial transactions if provided, otherwise they'll be loaded by the parent component
      setTransactions(initialTransactions)
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setError('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [currentWorkspace?.id, initialTransactions])

  // Load transactions on mount and workspace change
  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Handle transaction edit (Requirement 5.1: Allow editing of all transaction fields)
  const handleEditTransaction = (transaction: TransactionWithCategory) => {
    setEditingTransaction(transaction)
  }

  // Handle edit success (Requirement 5.3: Update transaction and return to list)
  const handleEditSuccess = (updatedTransaction: TransactionWithCategory) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    )
    setEditingTransaction(null)
  }

  // Handle transaction creation success
  const handleCreateSuccess = (newTransaction: TransactionWithCategory) => {
    setTransactions(prev => [newTransaction, ...prev])
    setShowCreateForm(false)
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
        // Keep the confirmation dialog open to show error
        return
      }

      // Store the deleted transaction for potential undo
      const deletedTransaction = transactions.find(t => t.id === transactionId)
      
      // Remove from list immediately (Requirement 6.2)
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
      
      // Close confirmation dialog
      setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' })
      
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
              
              // Add back to list
              setTransactions(prev => [deletedTransaction, ...prev])
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

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      transaction.description?.toLowerCase().includes(query) ||
      transaction.notes?.toLowerCase().includes(query) ||
      transaction.category?.name?.toLowerCase().includes(query)
    )
  })

  return (
    <div className={cn('space-y-4 lg:space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-primary">Transactions</h1>
          <p className="text-secondary mt-1">
            Manage your income and expenses
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          <span className="sm:inline">Add Transaction</span>
        </Button>
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
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {showFilters && <span className="text-xs">(Active)</span>}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 bg-glass border border-glass rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(false)}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-secondary text-sm">Advanced filtering options coming soon.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && transactions.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-glass border border-glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-secondary/20 rounded w-1/3"></div>
                <div className="h-4 bg-secondary/20 rounded w-1/4"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 bg-secondary/20 rounded w-1/4"></div>
                <div className="h-3 bg-secondary/20 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
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
              onClick={loadTransactions}
              className="text-red-500 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <TransactionList
        transactions={filteredTransactions}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        isLoading={isLoading}
        error={error}
        emptyMessage="No transactions found"
        emptyDescription={searchQuery 
          ? "Try adjusting your search terms or clear the search to see all transactions"
          : "Start by adding your first transaction to track your finances"
        }
      />

      {/* Create Transaction Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
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
  )
}