/**
 * Performance optimization hook for transaction lists
 * Implements debouncing, memoization, and virtual scrolling optimizations
 */

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { TransactionWithCategory, TransactionFilters } from '@/types/transactions'

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface UseTransactionPerformanceOptions {
  transactions: TransactionWithCategory[]
  searchQuery?: string
  filters?: TransactionFilters
  debounceMs?: number
  pageSize?: number
  enableVirtualization?: boolean
  virtualizationThreshold?: number
  skipDateFiltering?: boolean // NEW: Skip date filtering if already filtered by month
}

interface UseTransactionPerformanceReturn {
  filteredTransactions: TransactionWithCategory[]
  isFiltering: boolean
  shouldUseVirtualization: boolean
  paginatedTransactions: TransactionWithCategory[]
  hasMore: boolean
  loadMore: () => Promise<void>
  resetPagination: () => void
  searchStats: {
    total: number
    filtered: number
    isSearchActive: boolean
  }
}

export function useTransactionPerformance({
  transactions,
  searchQuery = '',
  filters,
  debounceMs = 300,
  pageSize = 50,
  enableVirtualization = true,
  virtualizationThreshold = 100,
  skipDateFiltering = false // NEW: Skip date filtering if already filtered by month
}: UseTransactionPerformanceOptions): UseTransactionPerformanceReturn {
  const [isFiltering, setIsFiltering] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery)
  
  // Refs for performance tracking
  const filterStartTime = useRef<number>(0)
  const lastFilterDuration = useRef<number>(0)
  
  // Debounced search query update - use useRef to maintain stable reference
  const debouncedSetSearchRef = useRef<(query: string) => void>()
  
  if (!debouncedSetSearchRef.current) {
    debouncedSetSearchRef.current = debounce((query: string) => {
      setDebouncedSearchQuery(query)
      setIsFiltering(false)
      setCurrentPage(1) // Reset pagination when search changes
    }, debounceMs)
  }
  
  // Update debounced search when searchQuery changes
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsFiltering(true)
      filterStartTime.current = performance.now()
      debouncedSetSearchRef.current?.(searchQuery)
    }
  }, [searchQuery, debouncedSearchQuery])
  
  // Memoized filtered transactions with performance tracking
  const filteredTransactions = useMemo(() => {
    const startTime = performance.now()
    
    let filtered = transactions
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(transaction => {
        return (
          transaction.description?.toLowerCase().includes(query) ||
          transaction.notes?.toLowerCase().includes(query) ||
          transaction.category?.name?.toLowerCase().includes(query)
        )
      })
    }
    
    // Apply additional filters
    if (filters) {
      // Type filter
      if (filters.type && filters.type !== 'all') {
        filtered = filtered.filter(t => t.type === filters.type)
      }
      
      // Category filter
      if (filters.categories?.length) {
        filtered = filtered.filter(t => 
          t.category_id && filters.categories!.includes(t.category_id)
        )
      }
      
      // Date range filter (skip if already filtered by month)
      if (filters.dateRange && !skipDateFiltering) {
        const { start, end } = filters.dateRange
        filtered = filtered.filter(t => {
          const transactionDate = new Date(t.transaction_date)
          return transactionDate >= start && transactionDate <= end
        })
      }
      
      // Member filter
      if (filters.members?.length) {
        filtered = filtered.filter(t => 
          filters.members!.includes(t.user_id)
        )
      }
    }
    
    // Sort by date (most recent first) - Requirement 3.1
    filtered.sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    )
    
    const duration = performance.now() - startTime
    lastFilterDuration.current = duration
    
    // Log performance in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`Transaction filtering took ${duration.toFixed(2)}ms for ${transactions.length} transactions`)
    }
    
    return filtered
  }, [transactions, debouncedSearchQuery, filters])
  
  // Determine if virtualization should be used
  const shouldUseVirtualization = useMemo(() => {
    return enableVirtualization && filteredTransactions.length > virtualizationThreshold
  }, [enableVirtualization, filteredTransactions.length, virtualizationThreshold])
  
  // Paginated transactions for non-virtualized lists
  const paginatedTransactions = useMemo(() => {
    if (shouldUseVirtualization) {
      return filteredTransactions // Return all for virtualization
    }
    
    return filteredTransactions.slice(0, currentPage * pageSize)
  }, [filteredTransactions, currentPage, pageSize, shouldUseVirtualization])
  
  // Check if there are more items to load
  const hasMore = useMemo(() => {
    if (shouldUseVirtualization) {
      return false // Virtualization handles all items
    }
    
    return paginatedTransactions.length < filteredTransactions.length
  }, [paginatedTransactions.length, filteredTransactions.length, shouldUseVirtualization])
  
  // Load more function for pagination
  const loadMore = useCallback(async (): Promise<void> => {
    if (hasMore && !isFiltering) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasMore, isFiltering])
  
  // Reset pagination
  const resetPagination = useCallback(() => {
    setCurrentPage(1)
  }, [])
  
  // Reset pagination when search query changes (handled in search effect above)
  // Filter changes will be handled by the consuming component
  
  // Search statistics
  const searchStats = useMemo(() => ({
    total: transactions.length,
    filtered: filteredTransactions.length,
    isSearchActive: Boolean(debouncedSearchQuery.trim() || filters)
  }), [transactions.length, filteredTransactions.length, debouncedSearchQuery, filters])
  
  return {
    filteredTransactions,
    isFiltering,
    shouldUseVirtualization,
    paginatedTransactions,
    hasMore,
    loadMore,
    resetPagination,
    searchStats
  }
}

// Performance monitoring hook
export function useTransactionPerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    filterTime: 0,
    itemCount: 0,
    lastUpdate: Date.now()
  })
  
  const recordRenderTime = useCallback((startTime: number, itemCount: number) => {
    const renderTime = performance.now() - startTime
    setMetrics(prev => ({
      ...prev,
      renderTime,
      itemCount,
      lastUpdate: Date.now()
    }))
  }, [])
  
  const recordFilterTime = useCallback((filterTime: number) => {
    setMetrics(prev => ({
      ...prev,
      filterTime,
      lastUpdate: Date.now()
    }))
  }, [])
  
  return {
    metrics,
    recordRenderTime,
    recordFilterTime
  }
}