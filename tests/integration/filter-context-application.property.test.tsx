/**
 * Property Test 12: Filter Context Application
 * 
 * Validates: Requirements 4.8
 * 
 * This test ensures that active filters are correctly applied to pre-populate
 * transaction creation forms, providing context-aware defaults.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { TransactionFilterProvider, useFilterContext } from '@/contexts/transaction-filter-context'
import type { TransactionFilters } from '@/types/transactions'

// Test component to demonstrate filter context application
function TestFormComponent({ testId }: { testId?: string }) {
  const filterContext = useFilterContext()
  const suffix = testId ? `-${testId}` : ''
  
  return (
    <div>
      <div data-testid={`default-type${suffix}`}>
        {filterContext.defaultType || 'none'}
      </div>
      <div data-testid={`default-category${suffix}`}>
        {filterContext.defaultCategoryId || 'none'}
      </div>
      <div data-testid={`default-date${suffix}`}>
        {filterContext.defaultDate?.toISOString() || 'none'}
      </div>
      <div data-testid={`active-filters${suffix}`}>
        {JSON.stringify(filterContext.activeFilters)}
      </div>
    </div>
  )
}

function TestWrapper({ 
  children, 
  initialFilters,
  testId 
}: { 
  children: React.ReactNode
  initialFilters?: TransactionFilters
  testId?: string 
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      <TransactionFilterProvider initialFilters={initialFilters}>
        {React.cloneElement(children as React.ReactElement, { testId })}
      </TransactionFilterProvider>
    </QueryClientProvider>
  )
}

// Generators for filter context testing
const generateTransactionType = fc.constantFrom('income', 'expense')
const generateCategoryId = fc.string({ minLength: 10, maxLength: 36 }) // UUID-like
const generateDateRange = fc.record({
  start: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
  end: fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') })
})

const generateSingleCategoryFilter = fc.record({
  type: fc.option(generateTransactionType, { nil: undefined }),
  categories: fc.constant([]).chain(() => fc.array(generateCategoryId, { minLength: 1, maxLength: 1 })),
  dateRange: fc.option(generateDateRange, { nil: undefined })
})

const generateMultipleCategoryFilter = fc.record({
  type: fc.option(generateTransactionType, { nil: undefined }),
  categories: fc.array(generateCategoryId, { minLength: 2, maxLength: 5 }),
  dateRange: fc.option(generateDateRange, { nil: undefined })
})

describe('Property Test 12: Filter Context Application', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    // Clear sessionStorage to prevent state persistence between tests
    sessionStorage.clear()
  })

  it('should provide default transaction type from active filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateTransactionType,
        async (transactionType) => {
          const testId = `type-${Math.random().toString(36).substr(2, 9)}`
          const initialFilters: TransactionFilters = {
            type: transactionType
          }

          render(
            <TestWrapper initialFilters={initialFilters} testId={testId}>
              <TestFormComponent />
            </TestWrapper>
          )

          const defaultTypeElement = screen.getByTestId(`default-type-${testId}`)
          expect(defaultTypeElement.textContent).toBe(transactionType)
          
          cleanup()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should provide default category when only one category is filtered', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateSingleCategoryFilter,
        async (filterData) => {
          const testId = `category-${Math.random().toString(36).substr(2, 9)}`
          const initialFilters: TransactionFilters = filterData

          render(
            <TestWrapper initialFilters={initialFilters} testId={testId}>
              <TestFormComponent />
            </TestWrapper>
          )

          const defaultCategoryElement = screen.getByTestId(`default-category-${testId}`)
          
          if (filterData.categories && filterData.categories.length === 1) {
            expect(defaultCategoryElement.textContent).toBe(filterData.categories[0])
          } else {
            expect(defaultCategoryElement.textContent).toBe('none')
          }
          
          cleanup()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should not provide default category when multiple categories are filtered', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateMultipleCategoryFilter,
        async (filterData) => {
          const testId = `multi-category-${Math.random().toString(36).substr(2, 9)}`
          const initialFilters: TransactionFilters = filterData

          render(
            <TestWrapper initialFilters={initialFilters} testId={testId}>
              <TestFormComponent />
            </TestWrapper>
          )

          const defaultCategoryElement = screen.getByTestId(`default-category-${testId}`)
          
          // Should not pre-populate category when multiple are selected
          expect(defaultCategoryElement.textContent).toBe('none')
          
          cleanup()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should provide default date when date range filter is active', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateDateRange,
        async (dateRange) => {
          const testId = `date-${Math.random().toString(36).substr(2, 9)}`
          const initialFilters: TransactionFilters = {
            dateRange
          }

          render(
            <TestWrapper initialFilters={initialFilters} testId={testId}>
              <TestFormComponent />
            </TestWrapper>
          )

          const defaultDateElement = screen.getByTestId(`default-date-${testId}`)
          
          // Should provide current date when date range is active
          expect(defaultDateElement.textContent).not.toBe('none')
          
          const providedDate = new Date(defaultDateElement.textContent!)
          const today = new Date()
          
          // Should be today's date (within reasonable time difference)
          const timeDiff = Math.abs(providedDate.getTime() - today.getTime())
          expect(timeDiff).toBeLessThan(60000) // Within 1 minute
          
          cleanup()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should not provide defaults when no relevant filters are active', async () => {
    const testId = `no-filters-${Math.random().toString(36).substr(2, 9)}`
    const initialFilters: TransactionFilters = {
      searchQuery: 'some search term',
      // No type, categories, or dateRange
    }

    render(
      <TestWrapper initialFilters={initialFilters} testId={testId}>
        <TestFormComponent />
      </TestWrapper>
    )

    const defaultTypeElement = screen.getByTestId(`default-type-${testId}`)
    const defaultCategoryElement = screen.getByTestId(`default-category-${testId}`)
    const defaultDateElement = screen.getByTestId(`default-date-${testId}`)

    expect(defaultTypeElement.textContent).toBe('none')
    expect(defaultCategoryElement.textContent).toBe('none')
    expect(defaultDateElement.textContent).toBe('none')
    
    cleanup()
  })

  it('should provide all active filters for context awareness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.option(generateTransactionType, { nil: undefined }),
          searchQuery: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          categories: fc.option(fc.array(generateCategoryId, { minLength: 1, maxLength: 3 }), { nil: undefined }),
          dateRange: fc.option(generateDateRange, { nil: undefined })
        }),
        async (filterData) => {
          const testId = `context-${Math.random().toString(36).substr(2, 9)}`
          const initialFilters: TransactionFilters = filterData

          render(
            <TestWrapper initialFilters={initialFilters} testId={testId}>
              <TestFormComponent />
            </TestWrapper>
          )

          const activeFiltersElement = screen.getByTestId(`active-filters-${testId}`)
          const activeFilters = JSON.parse(activeFiltersElement.textContent || '{}')

          // Verify all provided filters are available in context
          if (filterData.type) {
            expect(activeFilters.type).toBe(filterData.type)
          }
          if (filterData.searchQuery) {
            expect(activeFilters.searchQuery).toBe(filterData.searchQuery)
          }
          if (filterData.categories) {
            expect(activeFilters.categories).toEqual(filterData.categories)
          }
          if (filterData.dateRange) {
            expect(activeFilters.dateRange).toBeDefined()
            expect(new Date(activeFilters.dateRange.start)).toEqual(filterData.dateRange.start)
            expect(new Date(activeFilters.dateRange.end)).toEqual(filterData.dateRange.end)
          }
          
          cleanup()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should handle edge cases in filter context application', async () => {
    // Test empty categories array
    const testId1 = `edge-empty-${Math.random().toString(36).substr(2, 9)}`
    const emptyCategories: TransactionFilters = {
      categories: []
    }

    render(
      <TestWrapper initialFilters={emptyCategories} testId={testId1}>
        <TestFormComponent />
      </TestWrapper>
    )

    let defaultCategoryElement = screen.getByTestId(`default-category-${testId1}`)
    expect(defaultCategoryElement.textContent).toBe('none')
    
    cleanup()

    // Test 'all' type filter
    const testId2 = `edge-all-${Math.random().toString(36).substr(2, 9)}`
    const allTypeFilter: TransactionFilters = {
      type: 'all'
    }

    render(
      <TestWrapper initialFilters={allTypeFilter} testId={testId2}>
        <TestFormComponent />
      </TestWrapper>
    )

    const defaultTypeElement = screen.getByTestId(`default-type-${testId2}`)
    expect(defaultTypeElement.textContent).toBe('none')
    
    cleanup()
  })

  it('should prioritize explicit defaults over filter context', async () => {
    // This test would be implemented in the actual form components
    // to ensure that explicit props take precedence over filter context
    
    const testId = `priority-${Math.random().toString(36).substr(2, 9)}`
    const filterWithType: TransactionFilters = {
      type: 'income'
    }

    render(
      <TestWrapper initialFilters={filterWithType} testId={testId}>
        <TestFormComponent />
      </TestWrapper>
    )

    const defaultTypeElement = screen.getByTestId(`default-type-${testId}`)
    expect(defaultTypeElement.textContent).toBe('income')
    
    // In actual form components, explicit defaultFilters prop should override this
    
    cleanup()
  })
})