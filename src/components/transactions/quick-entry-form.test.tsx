/**
 * Unit tests for QuickEntryForm reconciliation integration
 * Tests Requirements 11.2, 11.3: Account pre-selection and type suggestion
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { QuickEntryForm } from './quick-entry-form'
import { useWorkspace } from '@/contexts/workspace-context'
import { TransactionFilterProvider } from '@/contexts/transaction-filter-context'
import { useCreateTransaction } from '@/hooks/use-transactions'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/contexts/workspace-context')
vi.mock('@/hooks/use-transactions')
vi.mock('@/components/categories', () => ({
  CategorySelectorWithInlineCreate: ({ value, onChange }: any) => (
    <input
      data-testid="category-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))
vi.mock('@/components/accounts', () => ({
  AccountSelector: ({ value, onChange }: any) => (
    <input
      data-testid="account-selector"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  currency: 'UAH',
  owner_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockCreateTransaction = vi.fn()

describe('QuickEntryForm - Reconciliation Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      isLoading: false,
      error: null,
      setCurrentWorkspace: vi.fn(),
      refreshWorkspaces: vi.fn(),
    })

    vi.mocked(useCreateTransaction).mockReturnValue({
      mutateAsync: mockCreateTransaction,
      isPending: false,
    } as any)

    mockCreateTransaction.mockResolvedValue({
      data: {
        id: 'tx-1',
        amount: 100,
        type: 'income',
        description: 'Test',
      },
    })
  })

  describe('Requirement 11.2: Account Pre-Selection', () => {
    it('should pre-select account when accountId prop is provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm accountId="account-123" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const accountSelector = screen.getByTestId('account-selector')
      expect(accountSelector).toHaveValue('account-123')
    })

    it('should not pre-select account when accountId prop is not provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const accountSelector = screen.getByTestId('account-selector')
      expect(accountSelector).toHaveValue('')
    })

    it('should allow changing pre-selected account', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm accountId="account-123" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const accountSelector = screen.getByTestId('account-selector')
      expect(accountSelector).toHaveValue('account-123')

      fireEvent.change(accountSelector, { target: { value: 'account-456' } })
      expect(accountSelector).toHaveValue('account-456')
    })
  })

  describe('Requirement 11.3: Transaction Type Suggestion', () => {
    it('should suggest income type when suggestedType is income', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm suggestedType="income" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const incomeButton = screen.getByRole('button', { name: /income/i })
      expect(incomeButton).toHaveClass('bg-accent-primary')
    })

    it('should suggest expense type when suggestedType is expense', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm suggestedType="expense" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const expenseButton = screen.getByRole('button', { name: /expense/i })
      expect(expenseButton).toHaveClass('bg-accent-primary')
    })

    it('should default to expense when no suggestedType provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const expenseButton = screen.getByRole('button', { name: /expense/i })
      expect(expenseButton).toHaveClass('bg-accent-primary')
    })

    it('should allow toggling suggested type', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm suggestedType="income" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const incomeButton = screen.getByRole('button', { name: /income/i })
      const expenseButton = screen.getByRole('button', { name: /expense/i })

      expect(incomeButton).toHaveClass('bg-accent-primary')

      fireEvent.click(expenseButton)
      expect(expenseButton).toHaveClass('bg-accent-primary')
      expect(incomeButton).not.toHaveClass('bg-accent-primary')
    })
  })

  describe('Combined Reconciliation Props', () => {
    it('should handle both accountId and suggestedType together', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm 
              accountId="account-123" 
              suggestedType="income" 
            />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const accountSelector = screen.getByTestId('account-selector')
      expect(accountSelector).toHaveValue('account-123')

      const incomeButton = screen.getByRole('button', { name: /income/i })
      expect(incomeButton).toHaveClass('bg-accent-primary')
    })

    it('should submit transaction with pre-selected account', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm 
              accountId="account-123" 
              suggestedType="income" 
            />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const amountInput = screen.getByPlaceholderText('0.00')
      fireEvent.change(amountInput, { target: { value: '100' } })

      const submitButton = screen.getByRole('button', { name: /save transaction/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalled()
      })

      const formData = mockCreateTransaction.mock.calls[0][0]
      expect(formData.get('account_id')).toBe('account-123')
      expect(formData.get('type')).toBe('income')
    })
  })

  describe('Priority Order', () => {
    it('suggestedType should override defaultFilters type', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm 
              suggestedType="income"
              defaultFilters={{ type: 'expense' }}
            />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const incomeButton = screen.getByRole('button', { name: /income/i })
      expect(incomeButton).toHaveClass('bg-accent-primary')
    })

    it('accountId should be used when provided', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <TransactionFilterProvider>
            <QuickEntryForm accountId="account-reconciliation" />
          </TransactionFilterProvider>
        </QueryClientProvider>
      )

      const accountSelector = screen.getByTestId('account-selector')
      expect(accountSelector).toHaveValue('account-reconciliation')
    })
  })
})
