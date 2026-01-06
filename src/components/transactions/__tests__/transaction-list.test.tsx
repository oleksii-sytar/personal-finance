/**
 * Tests for TransactionList component
 * Validates Requirements 3.1-3.7: Transaction list display, infinite scroll, and gestures
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TransactionList } from '../transaction-list'
import type { TransactionWithCategory } from '@/types/transactions'

// Mock the intersection observer
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})
window.IntersectionObserver = mockIntersectionObserver

// Mock transaction data
const mockTransactions: TransactionWithCategory[] = [
  {
    id: '1',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    amount: 1000,
    currency: 'UAH',
    type: 'income',
    description: 'Salary',
    transaction_date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    created_by: 'user-1',
    category_id: 'cat-1',
    transaction_type_id: 'type-1',
    notes: null,
    original_amount: null,
    original_currency: null,
    is_expected: false,
    expected_transaction_id: null,
    recurring_transaction_id: null,
    updated_by: null,
    deleted_at: null,
    category: {
      id: 'cat-1',
      workspace_id: 'workspace-1',
      name: 'Income',
      icon: '💰',
      color: null,
      is_default: true,
      type: 'income',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  },
  {
    id: '2',
    workspace_id: 'workspace-1',
    user_id: 'user-1',
    amount: 500,
    currency: 'UAH',
    type: 'expense',
    description: 'Groceries',
    transaction_date: '2024-01-14',
    created_at: '2024-01-14T15:00:00Z',
    updated_at: '2024-01-14T15:00:00Z',
    created_by: 'user-1',
    category_id: 'cat-2',
    transaction_type_id: 'type-2',
    notes: 'Weekly shopping',
    original_amount: null,
    original_currency: null,
    is_expected: false,
    expected_transaction_id: null,
    recurring_transaction_id: null,
    updated_by: null,
    deleted_at: null,
    category: {
      id: 'cat-2',
      workspace_id: 'workspace-1',
      name: 'Food',
      icon: '🍕',
      color: null,
      is_default: false,
      type: 'expense',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  }
]

describe('TransactionList', () => {
  it('renders transactions correctly', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
      />
    )

    // Check that transactions are displayed
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('Groceries')).toBeInTheDocument()
    
    // Check that income is displayed with proper styling (Requirement 3.3)
    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('shows empty state when no transactions', () => {
    render(
      <TransactionList
        transactions={[]}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        emptyMessage="No transactions yet"
        emptyDescription="Add your first transaction"
      />
    )

    expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first transaction')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    render(
      <TransactionList
        transactions={[]}
        hasMore={false}
        isLoading={true}
        isLoadingMore={false}
      />
    )

    // Should show skeleton loaders (each ListItemSkeleton has multiple animate-pulse elements)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows error state correctly', () => {
    render(
      <TransactionList
        transactions={[]}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        error="Failed to load transactions"
      />
    )

    expect(screen.getByRole('heading', { name: 'Failed to load transactions' })).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('calls onEdit when transaction is clicked', () => {
    const onEdit = vi.fn()
    render(
      <TransactionList
        transactions={mockTransactions}
        onEdit={onEdit}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
      />
    )

    // Click on the first transaction
    fireEvent.click(screen.getByText('Salary'))
    
    expect(onEdit).toHaveBeenCalledWith(mockTransactions[0])
  })

  it('shows load more indicator when hasMore is true', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        hasMore={true}
        isLoading={false}
        isLoadingMore={false}
      />
    )

    // Should have a load more trigger area
    expect(document.querySelector('[class*="h-4"]')).toBeInTheDocument()
  })

  it('shows loading more indicator when isLoadingMore is true', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        hasMore={true}
        isLoading={false}
        isLoadingMore={true}
      />
    )

    expect(screen.getByText('Loading more transactions...')).toBeInTheDocument()
  })

  it('displays transaction details correctly (Requirement 3.2)', () => {
    render(
      <TransactionList
        transactions={mockTransactions}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
      />
    )

    // Check that required transaction details are shown
    expect(screen.getByText('Salary')).toBeInTheDocument() // description
    expect(screen.getByText('Groceries')).toBeInTheDocument() // description
    expect(screen.getByText('💰 Income')).toBeInTheDocument() // category
    expect(screen.getByText('🍕 Food')).toBeInTheDocument() // category
    expect(screen.getByText('Weekly shopping')).toBeInTheDocument() // notes
    
    // Check dates are formatted correctly
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 14, 2024')).toBeInTheDocument()
  })

  it('handles retry on error', () => {
    const onLoadMore = vi.fn()
    render(
      <TransactionList
        transactions={[]}
        onLoadMore={onLoadMore}
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        error="Network error"
      />
    )

    fireEvent.click(screen.getByText('Try Again'))
    expect(onLoadMore).toHaveBeenCalled()
  })
})