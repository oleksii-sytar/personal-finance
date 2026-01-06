import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DetailedEntryForm } from '../detailed-entry-form'
import { useWorkspace } from '@/contexts/workspace-context'

// Mock the workspace context
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: vi.fn(),
}))

// Mock the actions
vi.mock('@/actions/transactions', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}))

vi.mock('@/actions/categories', () => ({
  getCategoriesByUsage: vi.fn().mockResolvedValue({ data: [] }),
}))

const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  owner_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockUseWorkspace = {
  currentWorkspace: mockWorkspace,
  workspaces: [mockWorkspace],
  members: [],
  invitations: [],
  loading: false,
  createWorkspace: vi.fn(),
  switchWorkspace: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
  refreshWorkspaces: vi.fn(),
}

describe('DetailedEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWorkspace).mockReturnValue(mockUseWorkspace)
  })

  it('renders with all required fields', () => {
    render(<DetailedEntryForm />)
    
    expect(screen.getByText('New Transaction')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Currency')).toBeInTheDocument() // Currency is a label, not a form control
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Notes (optional)')).toBeInTheDocument()
  })

  it('focuses amount field on mount (Requirement 2.2)', async () => {
    render(<DetailedEntryForm />)
    
    const amountInput = screen.getByLabelText('Amount')
    
    await waitFor(() => {
      expect(amountInput).toHaveFocus()
    })
  })

  it('defaults to UAH currency (Requirement 2.7)', () => {
    render(<DetailedEntryForm />)
    
    // Check that UAH is displayed in the currency selector button
    expect(screen.getByText('UAH')).toBeInTheDocument()
    expect(screen.getByText('₴')).toBeInTheDocument()
  })

  it('supports keyboard navigation with Tab (Requirement 2.2)', async () => {
    render(<DetailedEntryForm />)
    
    const amountInput = screen.getByLabelText('Amount')
    const currencyButton = screen.getByRole('button', { name: /UAH/i })
    
    // Wait for focus to be set asynchronously
    await waitFor(() => {
      expect(amountInput).toHaveFocus()
    })
    
    // Tab should move to currency
    fireEvent.keyDown(amountInput, { key: 'Tab' })
    // Note: jsdom doesn't automatically handle tab navigation, 
    // but we can verify the tabIndex attributes are set correctly
    expect(amountInput).toHaveAttribute('tabindex', '1')
    // Currency selector doesn't have explicit tabindex, but it's focusable
    expect(currencyButton).toBeInTheDocument()
  })

  it('shows type-ahead search for categories (Requirement 2.4)', async () => {
    const mockCategories = [
      { id: '1', name: 'Food', usage_count: 5 },
      { id: '2', name: 'Transport', usage_count: 3 },
    ]
    
    const { getCategoriesByUsage } = await import('@/actions/categories')
    vi.mocked(getCategoriesByUsage).mockResolvedValue({ data: mockCategories })
    
    render(<DetailedEntryForm />)
    
    const categoryInput = screen.getByLabelText('Category')
    
    // Focus on category input to show dropdown
    fireEvent.focus(categoryInput)
    
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument()
      expect(screen.getByText('Transport')).toBeInTheDocument()
    })
    
    // Type to filter
    fireEvent.change(categoryInput, { target: { value: 'foo' } })
    
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeInTheDocument()
      expect(screen.queryByText('Transport')).not.toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    render(<DetailedEntryForm />)
    
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    
    // Try to submit without required fields
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument()
    })
    
    // Add amount but no description
    const amountInput = screen.getByLabelText('Amount')
    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a description')).toBeInTheDocument()
    })
  })

  it('shows confirmation dialog when canceling with unsaved changes (Requirement 2.6)', () => {
    // Mock window.confirm
    const mockConfirm = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', mockConfirm)
    
    const mockOnCancel = vi.fn()
    render(<DetailedEntryForm onCancel={mockOnCancel} />)
    
    // Enter some data
    const amountInput = screen.getByLabelText('Amount')
    fireEvent.change(amountInput, { target: { value: '100' } })
    
    // Try to cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)
    
    expect(mockConfirm).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to cancel?'
    )
    expect(mockOnCancel).not.toHaveBeenCalled() // Should not cancel if user says no
    
    vi.unstubAllGlobals()
  })

  it('shows keyboard shortcuts help', () => {
    render(<DetailedEntryForm />)
    
    expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument()
    expect(screen.getByText('• Tab: Navigate fields')).toBeInTheDocument()
    expect(screen.getByText('• ⌘+S: Save transaction')).toBeInTheDocument()
    expect(screen.getByText('• Enter: Save (when focused)')).toBeInTheDocument()
    expect(screen.getByText('• Escape: Cancel')).toBeInTheDocument()
  })

  it('populates form when editing existing transaction', () => {
    const mockTransaction = {
      id: 'test-id',
      amount: 150,
      type: 'income' as const,
      description: 'Test transaction',
      notes: 'Test notes',
      transaction_date: '2024-01-15',
      currency: 'USD',
      category_id: 'cat-1',
    }
    
    render(<DetailedEntryForm transaction={mockTransaction} />)
    
    expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test transaction')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
    
    // Check that income type is selected
    const incomeButton = screen.getByRole('button', { name: /income/i })
    expect(incomeButton).toHaveClass('bg-accent-primary')
  })

  it('calls onSuccess callback when transaction is saved successfully', async () => {
    const mockOnSuccess = vi.fn()
    
    const { createTransaction } = await import('@/actions/transactions')
    vi.mocked(createTransaction).mockResolvedValue({
      data: { id: 'test-transaction-id', amount: 100 }
    })
    
    render(<DetailedEntryForm onSuccess={mockOnSuccess} />)
    
    // Fill required fields
    const amountInput = screen.getByLabelText('Amount')
    const descriptionInput = screen.getByLabelText('Description')
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    
    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test transaction' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        id: 'test-transaction-id',
        amount: 100
      })
    })
  })
})