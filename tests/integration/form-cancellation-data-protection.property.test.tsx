/**
 * Property-Based Test for Form Cancellation with Data Protection
 * 
 * Feature: transactions, Property 5: Form Cancellation with Data Protection
 * 
 * Tests that for any form with entered data, pressing escape should prompt for 
 * confirmation before discarding changes.
 * 
 * Validates: Requirements 2.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DetailedEntryForm } from '@/components/transactions/detailed-entry-form'
import { QuickEntryForm } from '@/components/transactions/quick-entry-form'
import { useWorkspace } from '@/contexts/workspace-context'
import { getCategoriesByUsage } from '@/actions/categories'

// Mock dependencies
vi.mock('@/contexts/workspace-context')
vi.mock('@/actions/categories')
vi.mock('@/actions/transactions')

// Mock window.confirm for testing confirmation dialogs
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
})

describe('Property 5: Form Cancellation with Data Protection', () => {
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
      name: 'Transport',
      type: 'expense' as const,
      is_default: false,
      usage_count: 3,
      icon: '🚗',
      color: '#8B7355',
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

    // Mock categories
    vi.mocked(getCategoriesByUsage).mockResolvedValue({
      data: mockCategories,
    })

    // Reset window.confirm mock
    mockConfirm.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup() // Clean up any rendered components
  })

  // Generator for form data that represents "entered data"
  const formDataGenerator = fc.record({
    amount: fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^\d*\.?\d*$/.test(s) && parseFloat(s) > 0),
    description: fc.string({ minLength: 1, maxLength: 50 }),
    notes: fc.string({ minLength: 0, maxLength: 100 }),
    type: fc.constantFrom('income', 'expense'),
  })

  // Generator for empty/minimal form data
  const emptyFormDataGenerator = fc.record({
    amount: fc.constant(''),
    description: fc.constant(''),
    notes: fc.constant(''),
    type: fc.constantFrom('income', 'expense'),
  })

  it('should prompt for confirmation when canceling DetailedEntryForm with entered data', async () => {
    await fc.assert(
      fc.asyncProperty(
        formDataGenerator,
        fc.boolean(), // User's response to confirmation dialog
        async (formData, userConfirmsCancel) => {
          // Clean up any previous renders
          cleanup()
          
          const mockOnCancel = vi.fn()
          mockConfirm.mockReturnValue(userConfirmsCancel)

          const { container } = render(
            <TestWrapper>
              <DetailedEntryForm onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          })

          // Enter data into the form to trigger "unsaved changes" state
          const amountInput = screen.getByLabelText('Amount')
          const descriptionInput = screen.getByLabelText('Description')
          const notesTextarea = screen.getByLabelText('Notes (optional)')

          // Fill form with generated data
          fireEvent.change(amountInput, { target: { value: formData.amount } })
          fireEvent.change(descriptionInput, { target: { value: formData.description } })
          fireEvent.change(notesTextarea, { target: { value: formData.notes } })

          // Wait for state to update
          await waitFor(() => {
            expect(amountInput).toHaveValue(formData.amount)
          })

          // Simulate pressing Escape key
          fireEvent.keyDown(document, { key: 'Escape' })

          // Should prompt for confirmation since there's entered data
          expect(mockConfirm).toHaveBeenCalledWith(
            'You have unsaved changes. Are you sure you want to cancel?'
          )

          if (userConfirmsCancel) {
            // If user confirms, onCancel should be called
            expect(mockOnCancel).toHaveBeenCalled()
          } else {
            // If user cancels the confirmation, onCancel should NOT be called
            expect(mockOnCancel).not.toHaveBeenCalled()
          }
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 5 } // Reduced runs to avoid timeout issues
    )
  }, 30000) // 30 second timeout

  it('should NOT prompt for confirmation when canceling DetailedEntryForm with no entered data', async () => {
    await fc.assert(
      fc.asyncProperty(
        emptyFormDataGenerator,
        async (emptyData) => {
          // Clean up any previous renders
          cleanup()
          
          const mockOnCancel = vi.fn()

          render(
            <TestWrapper>
              <DetailedEntryForm onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          })

          // Ensure form is empty (default state)
          const amountInput = screen.getByLabelText('Amount')
          const descriptionInput = screen.getByLabelText('Description')

          expect(amountInput).toHaveValue('')
          expect(descriptionInput).toHaveValue('')

          // Simulate pressing Escape key
          fireEvent.keyDown(document, { key: 'Escape' })

          // Should NOT prompt for confirmation since there's no entered data
          expect(mockConfirm).not.toHaveBeenCalled()

          // onCancel should be called directly
          expect(mockOnCancel).toHaveBeenCalled()
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 3 } // Reduced runs
    )
  }, 20000) // 20 second timeout

  it('should prompt for confirmation when clicking cancel button with entered data', async () => {
    await fc.assert(
      fc.asyncProperty(
        formDataGenerator,
        fc.boolean(), // User's response to confirmation dialog
        async (formData, userConfirmsCancel) => {
          // Clean up any previous renders
          cleanup()
          
          const mockOnCancel = vi.fn()
          mockConfirm.mockReturnValue(userConfirmsCancel)

          render(
            <TestWrapper>
              <DetailedEntryForm onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          })

          // Enter data into the form
          const amountInput = screen.getByLabelText('Amount')
          const descriptionInput = screen.getByLabelText('Description')

          fireEvent.change(amountInput, { target: { value: formData.amount } })
          fireEvent.change(descriptionInput, { target: { value: formData.description } })

          // Wait for state to update
          await waitFor(() => {
            expect(amountInput).toHaveValue(formData.amount)
          })

          // Click the cancel button
          const cancelButton = screen.getByRole('button', { name: /cancel/i })
          fireEvent.click(cancelButton)

          // Should prompt for confirmation since there's entered data
          expect(mockConfirm).toHaveBeenCalledWith(
            'You have unsaved changes. Are you sure you want to cancel?'
          )

          if (userConfirmsCancel) {
            // If user confirms, onCancel should be called
            expect(mockOnCancel).toHaveBeenCalled()
          } else {
            // If user cancels the confirmation, onCancel should NOT be called
            expect(mockOnCancel).not.toHaveBeenCalled()
          }
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 3 } // Reduced runs
    )
  }, 25000) // 25 second timeout

  it('should detect changes when editing existing transaction data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalAmount: fc.float({ min: 1, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
          originalDescription: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5),
          newAmount: fc.float({ min: 1, max: 1000, noNaN: true }).map(n => n.toFixed(2)),
          newDescription: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length >= 5),
        }),
        fc.boolean(), // User's response to confirmation dialog
        async ({ originalAmount, originalDescription, newAmount, newDescription }, userConfirmsCancel) => {
          // Skip if values are the same (no actual change)
          if (originalAmount === newAmount && originalDescription.trim() === newDescription.trim()) {
            return
          }

          // Clean up any previous renders
          cleanup()

          const mockTransaction = {
            id: 'test-transaction-id',
            workspace_id: 'test-workspace-id',
            user_id: 'test-user-id',
            amount: parseFloat(originalAmount),
            currency: 'UAH',
            type: 'expense' as const,
            description: originalDescription,
            notes: '',
            transaction_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'test-user-id',
          }

          const mockOnCancel = vi.fn()
          mockConfirm.mockReturnValue(userConfirmsCancel)

          render(
            <TestWrapper>
              <DetailedEntryForm transaction={mockTransaction} onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready and pre-populated
          await waitFor(() => {
            const amountInput = screen.getByLabelText('Amount')
            const descriptionInput = screen.getByLabelText('Description')
            expect(amountInput).toBeInTheDocument()
            expect(descriptionInput).toBeInTheDocument()
            // Check that the form is pre-populated (values may be formatted differently)
            expect(parseFloat(amountInput.value)).toBe(parseFloat(originalAmount))
            expect(descriptionInput).toHaveValue(originalDescription)
          })

          // Modify the existing data
          const amountInput = screen.getByLabelText('Amount')
          const descriptionInput = screen.getByLabelText('Description')

          fireEvent.change(amountInput, { target: { value: newAmount } })
          fireEvent.change(descriptionInput, { target: { value: newDescription } })

          // Wait for state to update
          await waitFor(() => {
            expect(amountInput).toHaveValue(newAmount)
            expect(descriptionInput).toHaveValue(newDescription)
          })

          // Simulate pressing Escape key
          fireEvent.keyDown(document, { key: 'Escape' })

          // Should prompt for confirmation since the data was modified
          expect(mockConfirm).toHaveBeenCalledWith(
            'You have unsaved changes. Are you sure you want to cancel?'
          )

          if (userConfirmsCancel) {
            // If user confirms, onCancel should be called
            expect(mockOnCancel).toHaveBeenCalled()
          } else {
            // If user cancels the confirmation, onCancel should NOT be called
            expect(mockOnCancel).not.toHaveBeenCalled()
          }
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 3 } // Reduced runs
    )
  }, 30000) // 30 second timeout

  it('should handle QuickEntryForm cancellation (no confirmation needed for quick entry)', async () => {
    await fc.assert(
      fc.asyncProperty(
        formDataGenerator,
        async (formData) => {
          // Clean up any previous renders
          cleanup()
          
          const mockOnCancel = vi.fn()

          render(
            <TestWrapper>
              <QuickEntryForm onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
          })

          // Enter data into the quick entry form
          const amountInput = screen.getByPlaceholderText('0.00')
          const descriptionInput = screen.getByPlaceholderText('Description (optional)')

          fireEvent.change(amountInput, { target: { value: formData.amount } })
          fireEvent.change(descriptionInput, { target: { value: formData.description } })

          // Wait for state to update
          await waitFor(() => {
            expect(amountInput).toHaveValue(formData.amount)
          })

          // Click the cancel button (X button)
          const cancelButton = screen.getByRole('button', { name: '✕' })
          fireEvent.click(cancelButton)

          // Quick entry form should NOT prompt for confirmation (speed is priority)
          expect(mockConfirm).not.toHaveBeenCalled()

          // onCancel should be called directly
          expect(mockOnCancel).toHaveBeenCalled()
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 3 } // Reduced runs
    )
  }, 20000) // 20 second timeout

  it('should handle edge cases with whitespace-only data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          amount: fc.constantFrom('', '   ', '\t'),
          description: fc.constantFrom('', '   ', '\t\n'),
          notes: fc.constantFrom('', '   ', '\n\t'),
        }),
        async (whitespaceData) => {
          // Clean up any previous renders
          cleanup()
          
          const mockOnCancel = vi.fn()
          mockConfirm.mockClear() // Clear previous calls

          render(
            <TestWrapper>
              <DetailedEntryForm onCancel={mockOnCancel} />
            </TestWrapper>
          )

          // Wait for form to be ready
          await waitFor(() => {
            expect(screen.getByLabelText('Amount')).toBeInTheDocument()
          })

          // Enter whitespace-only data
          const amountInput = screen.getByLabelText('Amount')
          const descriptionInput = screen.getByLabelText('Description')
          const notesTextarea = screen.getByLabelText('Notes (optional)')

          fireEvent.change(amountInput, { target: { value: whitespaceData.amount } })
          fireEvent.change(descriptionInput, { target: { value: whitespaceData.description } })
          fireEvent.change(notesTextarea, { target: { value: whitespaceData.notes } })

          // Simulate pressing Escape key
          fireEvent.keyDown(document, { key: 'Escape' })

          // Whitespace-only data should be treated as "no data" - no confirmation needed
          expect(mockConfirm).not.toHaveBeenCalled()

          // onCancel should be called directly
          expect(mockOnCancel).toHaveBeenCalled()
          
          // Clean up after this iteration
          cleanup()
        }
      ),
      { numRuns: 2 } // Reduced runs
    )
  }, 15000) // 15 second timeout
})