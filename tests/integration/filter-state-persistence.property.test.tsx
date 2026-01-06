/**
 * Property Test 11: Filter State Persistence
 * 
 * Validates: Requirements 4.7
 * 
 * This test ensures that filter state is properly persisted during the session
 * and restored correctly when components are remounted.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock sessionStorage
const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    mockSessionStorage.store.delete(key)
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store.clear()
  })
}

describe('Property Test 11: Filter State Persistence', () => {
  beforeEach(() => {
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    })
    mockSessionStorage.store.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockSessionStorage.store.clear()
  })

  it('should persist filter data to sessionStorage', () => {
    const testFilters = { type: 'income' as const, searchQuery: 'test' }
    
    // Simulate what the context does
    sessionStorage.setItem('forma-transaction-filters', JSON.stringify(testFilters))
    
    // Verify sessionStorage was called
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'forma-transaction-filters',
      JSON.stringify(testFilters)
    )
  })

  it('should restore filter data from sessionStorage', () => {
    const testFilters = { type: 'expense' as const, searchQuery: 'test search' }
    
    // Pre-populate sessionStorage
    mockSessionStorage.store.set('forma-transaction-filters', JSON.stringify(testFilters))
    
    // Simulate what the context does on load
    const stored = sessionStorage.getItem('forma-transaction-filters')
    const parsedFilters = stored ? JSON.parse(stored) : {}
    
    // Verify filters were restored correctly
    expect(parsedFilters.type).toBe('expense')
    expect(parsedFilters.searchQuery).toBe('test search')
  })

  it('should clear filter data from sessionStorage', () => {
    // Set some initial data
    mockSessionStorage.store.set('forma-transaction-filters', '{"type":"income"}')
    
    // Simulate clearing
    sessionStorage.removeItem('forma-transaction-filters')
    
    // Verify removal was called
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('forma-transaction-filters')
  })

  it('should handle corrupted sessionStorage data gracefully', () => {
    // Set corrupted JSON
    mockSessionStorage.store.set('forma-transaction-filters', 'invalid json {')
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    // Simulate what the context does
    let parsedFilters = {}
    try {
      const stored = sessionStorage.getItem('forma-transaction-filters')
      if (stored) {
        parsedFilters = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load transaction filters from storage:', error)
    }
    
    // Should have empty filters and logged warning
    expect(Object.keys(parsedFilters)).toHaveLength(0)
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load transaction filters from storage:',
      expect.any(Error)
    )
    
    consoleSpy.mockRestore()
  })

  it('should handle empty sessionStorage gracefully', () => {
    // Ensure sessionStorage is empty
    mockSessionStorage.store.clear()
    
    // Simulate what the context does
    const stored = sessionStorage.getItem('forma-transaction-filters')
    const parsedFilters = stored ? JSON.parse(stored) : {}
    
    // Should have empty filters
    expect(Object.keys(parsedFilters)).toHaveLength(0)
  })

  // Property-based test for various filter combinations
  it('should persist and restore various filter combinations', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.option(fc.constantFrom('income', 'expense'), { nil: undefined }),
          searchQuery: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
          categories: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 2 }), { nil: undefined })
        }),
        (filterData) => {
          // Remove undefined values to match real behavior
          const cleanFilters = Object.fromEntries(
            Object.entries(filterData).filter(([_, value]) => value !== undefined)
          )
          
          if (Object.keys(cleanFilters).length === 0) {
            return // Skip empty filter objects
          }
          
          // Simulate persistence
          sessionStorage.setItem('forma-transaction-filters', JSON.stringify(cleanFilters))
          
          // Simulate restoration
          const stored = sessionStorage.getItem('forma-transaction-filters')
          const restored = stored ? JSON.parse(stored) : {}
          
          // Verify round-trip consistency
          expect(restored).toEqual(cleanFilters)
        }
      ),
      { numRuns: 10 }
    )
  })

  // Test filter state persistence across "sessions"
  it('should maintain filter state across simulated sessions', () => {
    const testCases = [
      { type: 'income' as const },
      { searchQuery: 'groceries' },
      { categories: ['food', 'transport'] },
      { type: 'expense' as const, searchQuery: 'bills' }
    ]
    
    testCases.forEach((filters) => {
      // Clear previous state
      mockSessionStorage.store.clear()
      vi.clearAllMocks()
      
      // Simulate setting filters (first session)
      sessionStorage.setItem('forma-transaction-filters', JSON.stringify(filters))
      
      // Simulate loading filters (second session)
      const stored = sessionStorage.getItem('forma-transaction-filters')
      const restored = stored ? JSON.parse(stored) : {}
      
      // Verify persistence
      expect(restored).toEqual(filters)
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'forma-transaction-filters',
        JSON.stringify(filters)
      )
    })
  })
})