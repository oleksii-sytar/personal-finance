import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionEditModal } from '../transaction-edit-modal'
import type { TransactionWithCategory } from '@/types/transactions'

// Mock the DetailedEntryForm component
vi.mock('../detailed-entry-form', () => ({
  DetailedEntryForm: ({ transaction, onSuccess, onCancel }: any) => (
    <div data-testid="detailed-entry-form">
      <div>Editing transaction: {transaction?.description}</div>
      <button onClick={() => onSuccess?.(transaction)}>Save</button>
      <button onClick={() => onCancel?.()}>Cancel</button>
    </div>
  )
}))

const mockTransaction: TransactionWithCategory = {
  id: 'test-transaction-id',
  workspace_id: 'test-workspace-id',
  user_id: 'test-user-id',
  amount: 100,
  currency: 'UAH',
  type: 'expense',
  description: 'Test transaction',
  notes: 'Test notes',
  transaction_date: '2024-01-01',
  category_id: 'test-category-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'test-user-id',
  updated_by: null,
  deleted_at: null,
  original_amount: null,
  original_currency: null,
  is_expected: false,
  expected_transaction_id: null,
  recurring_transaction_id: null,
}

describe('TransactionEditModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
    expect(screen.getByTestId('detailed-entry-form')).toBeInTheDocument()
    expect(screen.getByText('Editing transaction: Test transaction')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.queryByText('Edit Transaction')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSuccess when form is saved', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    expect(mockOnSuccess).toHaveBeenCalledWith(mockTransaction)
  })

  it('calls onClose when form is cancelled', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when backdrop is clicked', () => {
    render(
      <TransactionEditModal
        transaction={mockTransaction}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    // Click on the backdrop (the modal overlay)
    const backdrop = screen.getByRole('dialog').parentElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })
})