/**
 * Property-Based Test for Edit Form Pre-Population
 * 
 * Feature: transactions, Property 13: Edit Form Pre-Population
 * 
 * Tests that for any transaction being edited, the edit form should be 
 * pre-populated with all current field values.
 * 
 * Validates: Requirements 5.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import React from 'react'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailedEntryForm } from '@/components/transactions/detailed-entry-form'
import { TransactionEditModal } from '@/components/transactions/transaction-edit-modal'
import { useWorkspace } from '@/contexts/workspace-context'
import { useFilterContext } from '@/contexts/transaction-filter-context'
import { getCategoriesByUsage } from '@/actions/categories'
import type { Transaction, TransactionWithCategory } from '@/types/transactions'

// Mock dependencies
vi.mock('@/contexts/workspace-context')
vi.mock('@/contexts/transaction-filter-context')
vi.mock('@/actions/categories')
vi.mock('@/actions/transactions')

describe('Property 13: Edit Form Pre-Population', () => {
  const mockWorkspace = {
    id: 'test-workspace-id',
    name: 'Test Workspace',
    owner_id: 'test-user-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockCategories = [
    {
      id: 'cat-1',
      workspace_id: 'test-workspace-id',
      name: 'Food',
      type: 'expense' as const,
      is_default: false,
      usage_count: 5,
      icon: '🍔',
      color: '#8B7355',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cat-2',
      workspace_id: 'test-workspace-id',
      name: 'Salary',
      type: 'income' as const,
      is_default: false,
      usage_count: 3,
      icon: '💰',
      color: '#4E7A58',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  // Test wrapper with QueryClient provider
  function TestWrapper({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock workspace context
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockWorkspace,
      workspaces: [mockWorkspace],
      isLoading: false,
      error: null,
      refreshWorkspaces: vi.fn(),
      setCurrentWorkspace: vi.fn(),
    })

    // Mock filter context
    vi.mocked(useFilterContext).mockReturnValue({
      defaultType: undefined,
      defaultCategoryId: undefined,
      defaultDate: undefined,
    })

    // Mock categories
    vi.mocked(getCategoriesByUsage).mockResolvedValue({
      data: mockCategories,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  // Generator for valid transaction data
  const transactionGenerator = fc.record({
    id: fc.uuid(),
    workspace_id: fc.uuid(),
    user_id: fc.uuid(),
    amount: fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }),
    currency: fc.constantFrom('UAH', 'USD', 'EUR'),
    type: fc.constantFrom('income', 'expense'),
    category_id: fc.oneof(fc.constant(null), fc.uuid()),
    description: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
    notes: fc.oneof(fc.constant(null), fc.string({ maxLength: 1000 })),
    transaction_date: fc.constant(new Date().toISOString()),
    created_at: fc.constant(new Date().toISOString()),
    updated_at: fc.constant(new Date().toISOString()),
    created_by: fc.uuid(),
    updated_by: fc.oneof(fc.constant(null), fc.uuid()),
    deleted_at: fc.constant(null),
    original_amount: fc.oneof(fc.constant(null), fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true })),
    original_currency: fc.oneof(fc.constant(null), fc.constantFrom('UAH', 'USD', 'EUR')),
    is_expected: fc.boolean(),
    expected_transaction_id: fc.oneof(fc.constant(null), fc.uuid()),
    recurring_transaction_id: fc.oneof(fc.constant(null), fc.uuid()),
    transaction_type_id: fc.oneof(fc.constant(null), fc.uuid()),
  })

  it('should pre-populate DetailedEntryForm with all transaction field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        transactionGenerator,
        async (transactionData) => {
          cleanup()

          const transaction = transactionData as Transaction

          render(
            <TestWrapper>
              <DetailedEntryForm transaction={transaction} />
            </TestWrapper>
          )

          // Wait for form to be ready and pre-populated
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          }, { timeout: 5000 })

          // Verify amount field is pre-populated
          const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
          expect(parseFloat(amountInput.value)).toBe(transaction.amount)

          // Verify description field is pre-populated
          const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement
          expect(descriptionInput.value).toBe(transaction.description)

          // Verify notes field is pre-populated (if notes exist)
          const notesTextarea = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement
          expect(notesTextarea.value).toBe(transaction.notes || '')

          // Verify date field is pre-populated
          const dateInput = screen.getByLabelText('Date') as HTMLInputElement
          const expectedDate = new Date(transaction.transaction_date).toISOString().split('T')[0]
          expect(dateInput.value).toBe(expectedDate)

          // Verify transaction type is pre-populated
          const typeButtons = screen.getAllByRole('button').filter(btn => 
            btn.textContent === 'Income' || btn.textContent === 'Expense'
          )
          const activeTypeButton = typeButtons.find(btn => 
            btn.classList.contains('bg-accent-primary') || 
            btn.getAttribute('class')?.includes('bg-accent-primary')
          )
          
          if (activeTypeButton) {
            const expectedType = transaction.type === 'income' ? 'Income' : 'Expense'
            expect(activeTypeButton.textContent).toBe(expectedType)
          }

          // Verify currency selector is pre-populated
          // Note: Currency selector might be a custom component, so we check for the value display
          const currencyElements = screen.getAllByText(transaction.currency)
          expect(currencyElements.length).toBeGreaterThan(0)

          cleanup()
        }
      ),
      { numRuns: 3 }
    )
  }, 30000)

  it('should pre-populate form fields correctly when transaction prop is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        transactionGenerator,
        async (transactionData) => {
          cleanup()

          const transaction = transactionData as Transaction

          render(
            <TestWrapper>
              <DetailedEntryForm transaction={transaction} />
            </TestWrapper>
          )

          // Wait for form to be ready and pre-populated
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          }, { timeout: 3000 })

          // Verify the form is pre-populated with transaction values
          const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
          expect(parseFloat(amountInput.value)).toBe(transaction.amount)

          const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement
          expect(descriptionInput.value).toBe(transaction.description)

          const notesTextarea = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement
          expect(notesTextarea.value).toBe(transaction.notes || '')

          const dateInput = screen.getByLabelText('Date') as HTMLInputElement
          const expectedDate = new Date(transaction.transaction_date).toISOString().split('T')[0]
          expect(dateInput.value).toBe(expectedDate)

          cleanup()
        }
      ),
      { numRuns: 2 }
    )
  }, 15000)

  it('should handle edge cases with null/undefined values correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          workspace_id: fc.uuid(),
          user_id: fc.uuid(),
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }),
          currency: fc.constantFrom('UAH', 'USD', 'EUR'),
          type: fc.constantFrom('income', 'expense'),
          category_id: fc.constant(null), // Always null for this test
          description: fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          notes: fc.constant(null), // Always null for this test
          transaction_date: fc.constant(new Date().toISOString()),
          created_at: fc.constant(new Date().toISOString()),
          updated_at: fc.constant(new Date().toISOString()),
          created_by: fc.uuid(),
          updated_by: fc.constant(null),
          deleted_at: fc.constant(null),
          original_amount: fc.constant(null),
          original_currency: fc.constant(null),
          is_expected: fc.boolean(),
          expected_transaction_id: fc.constant(null),
          recurring_transaction_id: fc.constant(null),
          transaction_type_id: fc.constant(null),
        }),
        async (transactionData) => {
          cleanup()

          const transaction = transactionData as Transaction

          render(
            <TestWrapper>
              <DetailedEntryForm transaction={transaction} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          }, { timeout: 5000 })

          // Verify null values are handled correctly (should show as empty strings)
          const notesTextarea = screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement
          expect(notesTextarea.value).toBe('') // null notes should become empty string

          // Verify required fields are still populated
          const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
          expect(parseFloat(amountInput.value)).toBe(transaction.amount)

          const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement
          expect(descriptionInput.value).toBe(transaction.description)

          cleanup()
        }
      ),
      { numRuns: 2 }
    )
  }, 15000)

  it('should preserve original values when form is rendered multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        transactionGenerator,
        async (transactionData) => {
          cleanup()

          const transaction = transactionData as Transaction

          // Render the form multiple times to ensure consistency
          for (let i = 0; i < 3; i++) {
            cleanup()

            render(
              <TestWrapper>
                <DetailedEntryForm transaction={transaction} />
              </TestWrapper>
            )

            // Wait for form to be ready
            await waitFor(() => {
              expect(screen.getByLabelText('Amount')).toBeInTheDocument()
            }, { timeout: 5000 })

            // Verify values are consistently pre-populated
            const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
            expect(parseFloat(amountInput.value)).toBe(transaction.amount)

            const descriptionInput = screen.getByLabelText('Description') as HTMLInputElement
            expect(descriptionInput.value).toBe(transaction.description)

            const dateInput = screen.getByLabelText('Date') as HTMLInputElement
            const expectedDate = new Date(transaction.transaction_date).toISOString().split('T')[0]
            expect(dateInput.value).toBe(expectedDate)
          }

          cleanup()
        }
      ),
      { numRuns: 2 }
    )
  }, 20000)

  it('should handle different currency values correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currency: fc.constantFrom('UAH', 'USD', 'EUR', 'GBP', 'PLN'),
          amount: fc.float({ min: Math.fround(0.01), max: Math.fround(999999.99), noNaN: true }),
          description: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          type: fc.constantFrom('income', 'expense'),
        }),
        async ({ currency, amount, description, type }) => {
          cleanup()

          const transaction: Transaction = {
            id: 'test-id',
            workspace_id: 'test-workspace-id',
            user_id: 'test-user-id',
            amount,
            currency,
            type: type as 'income' | 'expense',
            category_id: null,
            description,
            notes: null,
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'test-user-id',
            updated_by: null,
            deleted_at: null,
            original_amount: null,
            original_currency: null,
            is_expected: false,
            expected_transaction_id: null,
            recurring_transaction_id: null,
            transaction_type_id: null,
          }

          render(
            <TestWrapper>
              <DetailedEntryForm transaction={transaction} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          }, { timeout: 5000 })

          // Verify currency is displayed somewhere in the form
          const currencyElements = screen.getAllByText(currency)
          expect(currencyElements.length).toBeGreaterThan(0)

          // Verify amount is correctly pre-populated
          const amountInput = screen.getByLabelText('Amount') as HTMLInputElement
          expect(parseFloat(amountInput.value)).toBe(amount)

          cleanup()
        }
      ),
      { numRuns: 2 }
    )
  }, 15000)
})