'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import type { TransactionFilters } from '@/types/transactions'

interface TransactionFilterContextType {
  filters: TransactionFilters
  setFilters: (filters: TransactionFilters) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

const TransactionFilterContext = createContext<TransactionFilterContextType | undefined>(undefined)

interface TransactionFilterProviderProps {
  children: ReactNode
  initialFilters?: TransactionFilters
}

const STORAGE_KEY = 'forma-transaction-filters'

export function TransactionFilterProvider({ 
  children, 
  initialFilters = {} 
}: TransactionFilterProviderProps) {
  // Extract values for stable dependencies
  const searchQuery = initialFilters.searchQuery
  const type = initialFilters.type
  const categoriesKey = initialFilters.categories?.join(',')
  const membersKey = initialFilters.members?.join(',')
  const startTime = initialFilters.dateRange?.start?.getTime()
  const endTime = initialFilters.dateRange?.end?.getTime()

  // Memoize initialFilters to prevent infinite re-renders
  const memoizedInitialFilters = useMemo(() => initialFilters, [
    searchQuery,
    type,
    categoriesKey,
    membersKey,
    startTime,
    endTime
  ])

  const [filters, setFiltersState] = useState<TransactionFilters>(() => {
    // Initialize with stored filters if available, but prioritize initialFilters
    if (typeof window === 'undefined') {
      // Server-side rendering: use initialFilters only
      return memoizedInitialFilters
    }
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored && Object.keys(memoizedInitialFilters).length === 0) {
        const parsedFilters = JSON.parse(stored)
        // Convert date strings back to Date objects
        if (parsedFilters.dateRange) {
          parsedFilters.dateRange = {
            start: new Date(parsedFilters.dateRange.start),
            end: new Date(parsedFilters.dateRange.end)
          }
        }
        return parsedFilters
      }
    } catch (error) {
      console.warn('Failed to load transaction filters from storage:', error)
    }
    return memoizedInitialFilters
  })

  // Load filters from sessionStorage on mount only if no initialFilters provided
  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') return
    
    if (Object.keys(memoizedInitialFilters).length > 0) {
      // If initialFilters are provided, use them (for testing)
      setFiltersState(memoizedInitialFilters)
      return
    }

    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedFilters = JSON.parse(stored)
        // Convert date strings back to Date objects
        if (parsedFilters.dateRange) {
          parsedFilters.dateRange = {
            start: new Date(parsedFilters.dateRange.start),
            end: new Date(parsedFilters.dateRange.end)
          }
        }
        setFiltersState(parsedFilters)
      }
    } catch (error) {
      console.warn('Failed to load transaction filters from storage:', error)
    }
  }, [memoizedInitialFilters, initialFilters])

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') return
    
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.warn('Failed to save transaction filters to storage:', error)
    }
  }, [filters])

  const setFilters = (newFilters: TransactionFilters) => {
    setFiltersState(newFilters)
  }

  const clearFilters = () => {
    setFiltersState({})
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.warn('Failed to clear transaction filters from storage:', error)
      }
    }
  }

  const hasActiveFilters = !!(
    filters.searchQuery ||
    filters.dateRange ||
    filters.categories?.length ||
    filters.members?.length ||
    (filters.type && filters.type !== 'all')
  )

  return (
    <TransactionFilterContext.Provider
      value={{
        filters,
        setFilters,
        clearFilters,
        hasActiveFilters
      }}
    >
      {children}
    </TransactionFilterContext.Provider>
  )
}

export function useTransactionFilters() {
  const context = useContext(TransactionFilterContext)
  if (context === undefined) {
    throw new Error('useTransactionFilters must be used within a TransactionFilterProvider')
  }
  return context
}

/**
 * Hook to get filter context for pre-populating transaction forms
 * Implements Requirement 4.8: Filter context application
 * Returns safe defaults when used outside of TransactionFilterProvider
 */
export function useFilterContext() {
  const context = useContext(TransactionFilterContext)
  
  if (!context) {
    // Return safe defaults when used outside of TransactionFilterProvider
    return {
      defaultType: undefined,
      defaultCategoryId: undefined,
      defaultDate: undefined,
      activeFilters: {}
    }
  }
  
  const { filters } = context
  
  return {
    // Pre-populate transaction type from filter
    defaultType: filters.type && filters.type !== 'all' ? filters.type : undefined,
    
    // Pre-populate category if only one is selected
    defaultCategoryId: filters.categories?.length === 1 ? filters.categories[0] : undefined,
    
    // Pre-populate date if within a specific range
    defaultDate: filters.dateRange ? new Date() : undefined,
    
    // Get all active filters for context
    activeFilters: filters
  }
}