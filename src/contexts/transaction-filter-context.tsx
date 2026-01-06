'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react'
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
  // Use ref to track if we've initialized from props
  const initializedFromProps = useRef(false)
  
  const [filters, setFiltersState] = useState<TransactionFilters>(() => {
    // Initialize with stored filters if available, but prioritize initialFilters
    if (typeof window === 'undefined') {
      // Server-side rendering: use initialFilters only
      return initialFilters
    }
    
    // If initialFilters are provided, use them
    if (Object.keys(initialFilters).length > 0) {
      initializedFromProps.current = true
      return initialFilters
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
        return parsedFilters
      }
    } catch (error) {
      console.warn('Failed to load transaction filters from storage:', error)
    }
    return {}
  })

  // Load filters from sessionStorage on mount only if no initialFilters provided
  useEffect(() => {
    // Skip on server-side rendering
    if (typeof window === 'undefined') return
    
    // Skip if we already initialized from props
    if (initializedFromProps.current) return
    
    // Skip if initialFilters are provided
    if (Object.keys(initialFilters).length > 0) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run on mount, intentionally excluding initialFilters to prevent infinite loops

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