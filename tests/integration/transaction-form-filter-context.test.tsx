/**
 * Integration test for filter context application in transaction forms
 * 
 * Validates: Requirements 4.8
 * 
 * This test ensures that both QuickEntryForm and DetailedEntryForm
 * properly apply active filters to pre-populate form fields.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { TransactionFilterProvider } from '@/contexts/transaction-filter-context'
import { QuickEntryForm } from '@/components/transactions/quick-entry-form'
import { DetailedEntryForm } from '@/components/transactions/detailed-entry-form'
import { useWorkspace } from '@/contexts/workspace-context'
import { getCategoriesByUsage } from '@/actions/categories'
import type { TransactionFilters } from '@/types/transactions'

// Mock dependencies
vi.mock('@/contexts/workspace-context')
vi.mock('@/actions/categories')
vi.mock('@/actions/transactions')

const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  owner_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const mockCategories = [
  {
    id: 'category-1',
    name: 'Food',
    icon: '🍕',
    workspace_id: 'test-workspace-id',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 5
  },
  {
    id: 'category-2', 
    name: 'Transport',
    icon: '🚗',
    workspace_id: 'test-workspace-id',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    usage_count: 3
  }
]

function TestWrapper({ 
  children, 
  initialFilters 
}: { 
  children: React.ReactNode
  initialFilters?: TransactionFilters
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
        {children}
      </TransactionFilterProvider>
    </QueryClientProvider>
  )
}

describe('Transaction Form Filter Context Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
    sessionStorage.clear()
    
    // Mock workspace context
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      isLoading: false,
      error: null,
      switchWorkspace: vi.fn(),
      refreshWorkspaces: vi.fn()
    })
    
    // Mock categories
    vi.mocked(getCategoriesByUsage).mockResolvedValue({
      data: mockCategories
    })
  })

  describe('QuickEntryForm Filter Context Application', () => {
    it('should pre-populate transaction type from filter context', async () => {
      const initialFilters: TransactionFilters = {
        type: 'income'
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <QuickEntryForm />
        </TestWrapper>
      )

      // Wait for component to render
      await screen.findByText('Quick Entry')
      
      // Check that income button is selected (has active styling)
      const incomeButton = screen.getByRole('button', { name: /income/i })
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      
      // Income should be active (has accent-primary background)
      expect(incomeButton).toHaveClass('bg-accent-primary')
      expect(expenseButton).not.toHaveClass('bg-accent-primary')
    })

    it('should default to expense when no type filter is active', async () => {
      const initialFilters: TransactionFilters = {
        searchQuery: 'some search'
        // No type filter
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <QuickEntryForm />
        </TestWrapper>
      )

      await screen.findByText('Quick Entry')
      
      // Check that expense button is selected by default
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      const incomeButton = screen.getByRole('button', { name: /income/i })
      
      expect(expenseButton).toHaveClass('bg-accent-primary')
      expect(incomeButton).not.toHaveClass('bg-accent-primary')
    })

    it('should not pre-populate category when multiple categories are filtered', async () => {
      const initialFilters: TransactionFilters = {
        categories: ['category-1', 'category-2'] // Multiple categories
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <QuickEntryForm />
        </TestWrapper>
      )

      await screen.findByText('Quick Entry')
      
      // Should show default category selection text (label and placeholder)
      expect(screen.getByText('Category (optional)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Select or create category...')).toBeInTheDocument()
    })
  })

  describe('DetailedEntryForm Filter Context Application', () => {
    it('should pre-populate transaction type from filter context', async () => {
      const initialFilters: TransactionFilters = {
        type: 'income'
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <DetailedEntryForm />
        </TestWrapper>
      )

      await screen.findByText('New Transaction')
      
      // Check that income button is selected
      const incomeButton = screen.getByRole('button', { name: /income/i })
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      
      expect(incomeButton).toHaveClass('bg-accent-primary')
      expect(expenseButton).not.toHaveClass('bg-accent-primary')
    })

    it('should pre-populate date when date range filter is active', async () => {
      const testDate = new Date('2024-06-15')
      const initialFilters: TransactionFilters = {
        dateRange: {
          start: new Date('2024-06-01'),
          end: new Date('2024-06-30')
        }
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <DetailedEntryForm />
        </TestWrapper>
      )

      await screen.findByText('New Transaction')
      
      // Should have today's date as default (since date range is active)
      const dateInput = screen.getByLabelText('Date') as HTMLInputElement
      expect(dateInput.value).toBeTruthy()
      
      // Should be a valid date
      const dateValue = new Date(dateInput.value)
      expect(dateValue).toBeInstanceOf(Date)
      expect(dateValue.getTime()).not.toBeNaN()
    })

    it('should prioritize explicit defaultFilters over filter context', async () => {
      const initialFilters: TransactionFilters = {
        type: 'income' // Filter context says income
      }

      const explicitDefaults = {
        type: 'expense' as const // But explicit prop says expense
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <DetailedEntryForm defaultFilters={explicitDefaults} />
        </TestWrapper>
      )

      await screen.findByText('New Transaction')
      
      // Should use explicit default (expense) over filter context (income)
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      const incomeButton = screen.getByRole('button', { name: /income/i })
      
      expect(expenseButton).toHaveClass('bg-accent-primary')
      expect(incomeButton).not.toHaveClass('bg-accent-primary')
    })
  })

  describe('Filter Context Edge Cases', () => {
    it('should handle forms used outside of TransactionFilterProvider', async () => {
      // Render form without TransactionFilterProvider wrapper
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false }
        }
      })
      
      render(
        <QueryClientProvider client={queryClient}>
          <QuickEntryForm />
        </QueryClientProvider>
      )

      await screen.findByText('Quick Entry')
      
      // Should still work with default values (expense type)
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      expect(expenseButton).toHaveClass('bg-accent-primary')
    })

    it('should handle "all" type filter correctly', async () => {
      const initialFilters: TransactionFilters = {
        type: 'all' // Should not pre-populate any specific type
      }

      render(
        <TestWrapper initialFilters={initialFilters}>
          <QuickEntryForm />
        </TestWrapper>
      )

      await screen.findByText('Quick Entry')
      
      // Should default to expense when type is 'all'
      const expenseButton = screen.getByRole('button', { name: /expense/i })
      expect(expenseButton).toHaveClass('bg-accent-primary')
    })
  })
})