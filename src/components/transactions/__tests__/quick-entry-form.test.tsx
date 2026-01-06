import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuickEntryForm } from '../quick-entry-form'
import { useWorkspace } from '@/contexts/workspace-context'

// Mock the workspace context
vi.mock('@/contexts/workspace-context', () => ({
  useWorkspace: vi.fn(),
}))

// Mock the actions
vi.mock('@/actions/transactions', () => ({
  createTransaction: vi.fn(),
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

describe('QuickEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWorkspace).mockReturnValue(mockUseWorkspace)
  })

  it('renders with default expense type', () => {
    render(<QuickEntryForm />)
    
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    expect(screen.getByText('Quick Entry')).toBeInTheDocument()
    
    // Check that expense is selected by default (Requirement 1.6)
    const expenseButton = screen.getByRole('button', { name: /expense/i })
    expect(expenseButton).toHaveClass('bg-accent-primary')
  })

  it('focuses amount field on mount', async () => {
    render(<QuickEntryForm />)
    
    const amountInput = screen.getByPlaceholderText('0.00')
    
    // Wait for focus to be applied
    await waitFor(() => {
      expect(amountInput).toHaveFocus()
    })
  })

  it('toggles between expense and income types', () => {
    render(<QuickEntryForm />)
    
    const incomeButton = screen.getByRole('button', { name: /income/i })
    const expenseButton = screen.getByRole('button', { name: /expense/i })
    
    // Initially expense should be selected
    expect(expenseButton).toHaveClass('bg-accent-primary')
    expect(incomeButton).not.toHaveClass('bg-accent-primary')
    
    // Click income button
    fireEvent.click(incomeButton)
    
    // Now income should be selected
    expect(incomeButton).toHaveClass('bg-accent-primary')
    expect(expenseButton).not.toHaveClass('bg-accent-primary')
  })

  it('validates amount input to only allow numbers and decimal', () => {
    render(<QuickEntryForm />)
    
    const amountInput = screen.getByPlaceholderText('0.00')
    
    // Valid inputs
    fireEvent.change(amountInput, { target: { value: '123.45' } })
    expect(amountInput).toHaveValue('123.45')
    
    fireEvent.change(amountInput, { target: { value: '100' } })
    expect(amountInput).toHaveValue('100')
    
    // Invalid inputs should be rejected
    fireEvent.change(amountInput, { target: { value: 'abc' } })
    expect(amountInput).toHaveValue('100') // Should keep previous valid value
    
    fireEvent.change(amountInput, { target: { value: '12.34.56' } })
    expect(amountInput).toHaveValue('100') // Should keep previous valid value
  })

  it('shows error for invalid amount on submit', async () => {
    render(<QuickEntryForm />)
    
    const amountInput = screen.getByPlaceholderText('0.00')
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    
    // Enter invalid amount (0)
    fireEvent.change(amountInput, { target: { value: '0' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument()
    })
  })

  it('shows category selection dropdown', () => {
    render(<QuickEntryForm />)
    
    const categoryButton = screen.getByText('Select category (optional)')
    fireEvent.click(categoryButton)
    
    expect(screen.getByText('Recent & Frequent')).toBeInTheDocument()
  })

  it('calls onSuccess callback when transaction is created successfully', async () => {
    const mockOnSuccess = vi.fn()
    
    // Mock the createTransaction function to return success
    const { createTransaction } = await import('@/actions/transactions')
    vi.mocked(createTransaction).mockResolvedValue({
      data: { id: 'test-transaction-id', amount: 100 }
    })
    
    render(<QuickEntryForm onSuccess={mockOnSuccess} />)
    
    const amountInput = screen.getByPlaceholderText('0.00')
    const submitButton = screen.getByRole('button', { name: /save transaction/i })
    
    fireEvent.change(amountInput, { target: { value: '100' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        id: 'test-transaction-id',
        amount: 100
      })
    })
  })

  it('calls onCancel callback when cancel button is clicked', () => {
    const mockOnCancel = vi.fn()
    
    render(<QuickEntryForm onCancel={mockOnCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: '✕' })
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('applies default filters when provided', () => {
    render(
      <QuickEntryForm 
        defaultFilters={{ type: 'income' }} 
      />
    )
    
    // Income should be selected instead of default expense
    const incomeButton = screen.getByRole('button', { name: /income/i })
    expect(incomeButton).toHaveClass('bg-accent-primary')
  })
})