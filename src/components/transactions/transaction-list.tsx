/**
 * Enhanced TransactionList component with infinite scroll and advanced features
 * Implements Requirements 3.1, 3.5: Most recent first ordering and infinite scroll
 * Implements Requirements 3.6, 3.7: Tap-to-edit and swipe-to-delete gestures
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2Icon, AlertCircleIcon } from 'lucide-react'
import { ListItemSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/Button'
import { TransactionItem } from './transaction-item'
import { cn } from '@/lib/utils'
import type { TransactionWithCategory, TransactionFilters } from '@/types/transactions'

interface TransactionListProps {
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
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  error = null,
  filters,
  className,
  emptyMessage = 'No transactions found',
  emptyDescription = 'Start by adding your first transaction'
}: TransactionListProps) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  // Set up intersection observer for infinite scroll (Requirement 3.5)
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }
    
    observerRef.current = observer
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [onLoadMore, hasMore, isLoadingMore])
  
  // Trigger load more when intersection is detected
  useEffect(() => {
    if (isIntersecting && onLoadMore && hasMore && !isLoadingMore) {
      onLoadMore()
    }
  }, [isIntersecting, onLoadMore, hasMore, isLoadingMore])
  
  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (onLoadMore) {
      onLoadMore()
    }
  }, [onLoadMore])
  
  // Show loading skeleton for initial load
  if (isLoading && transactions.length === 0) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ListItemSkeleton key={i} className="bg-glass border border-glass rounded-xl" />
        ))}
      </div>
    )
  }
  
  // Show error state
  if (error && transactions.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'bg-glass border border-glass rounded-xl',
        className
      )}>
        <AlertCircleIcon className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-primary mb-2">Failed to load transactions</h3>
        <p className="text-muted mb-4">{error}</p>
        <Button onClick={handleRetry} variant="primary" size="sm">
          Try Again
        </Button>
      </div>
    )
  }
  
  // Show empty state
  if (transactions.length === 0) {
    const hasActiveFilters = filters && (
      filters.categories?.length || 
      filters.type !== 'all' || 
      filters.searchQuery ||
      filters.dateRange
    )
    
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'bg-glass border border-glass rounded-xl',
        className
      )}>
        <div className="w-16 h-16 bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">💰</span>
        </div>
        <h3 className="text-lg font-semibold text-primary mb-2">
          {hasActiveFilters ? 'No matching transactions' : emptyMessage}
        </h3>
        <p className="text-muted max-w-sm">
          {hasActiveFilters 
            ? 'Try adjusting your filters to see more results'
            : emptyDescription
          }
        </p>
        {hasActiveFilters && (
          <Button 
            onClick={() => window.location.reload()} 
            variant="ghost" 
            size="sm" 
            className="mt-4"
          >
            Clear Filters
          </Button>
        )}
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Transaction items - sorted by most recent first (Requirement 3.1) */}
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      
      {/* Infinite scroll trigger and loading states */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isLoadingMore ? (
            <div className="flex items-center space-x-2 text-muted">
              <Loader2Icon className="w-4 h-4 animate-spin" />
              <span>Loading more transactions...</span>
            </div>
          ) : (
            <div className="h-4" /> // Invisible trigger area
          )}
        </div>
      )}
      
      {/* Error state for load more */}
      {error && transactions.length > 0 && (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertCircleIcon className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-sm text-muted mb-2">Failed to load more transactions</p>
          <Button onClick={handleRetry} variant="ghost" size="sm">
            Try Again
          </Button>
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasMore && transactions.length > 10 && (
        <div className="flex justify-center py-4">
          <p className="text-sm text-muted">You've reached the end of your transactions</p>
        </div>
      )}
    </div>
  )
}