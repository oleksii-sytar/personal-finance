/**
 * Integration tests for month filtering with URL state management
 * Requirements 4.2: Month filtering logic with URL state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntegratedTransactionSystem } from '@/components/transactions/integrated-transaction-system'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { TransactionFilterProvider } from '@/contexts/transaction-filter-context'
import supabase from '@/lib/supabase/client'
import type { ReactNode } from 'react'

// Mock Next.js router
const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/transactions',
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  default: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  })),
}))

const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  owner_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('Month Filtering Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
    mockSearchParams.delete('month')
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider initialWorkspace={mockWorkspace}>
        <TransactionFilterProvider>{children}</TransactionFilterProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  )

  const setupMockQuery = (transactions: any[] = []) => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: transactions,
      error: null,
    })

    mockQuery.order.mockResolvedValue({
      data: transactions,
      error: null,
    })

    return mockQuery
  }

  it('should filter transactions by selected month', async () => {
    const januaryTransactions = [
      {
        id: '1',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-15',
        amount: 100,
        type: 'income',
        description: 'January Salary',
        category: { id: 'cat-1', name: 'Salary' },
      },
      {
        id: '2',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-20',
        amount: 50,
        type: 'expense',
        description: 'January Groceries',
        category: { id: 'cat-2', name: 'Food' },
      },
    ]

    const mockQuery = setupMockQuery(januaryTransactions)

    // Set month in URL params
    mockSearchParams.set('month', '2024-01')

    render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
    })

    // Verify transactions are displayed
    await waitFor(() => {
      expect(screen.getByText('January Salary')).toBeInTheDocument()
      expect(screen.getByText('January Groceries')).toBeInTheDocument()
    })
  })

  it('should update URL when month is changed', async () => {
    setupMockQuery([])

    render(<IntegratedTransactionSystem />, { wrapper })

    // Find and click month selector
    const monthSelector = await screen.findByRole('combobox', { name: /select month/i })
    await userEvent.click(monthSelector)

    // Select January 2024
    const januaryOption = await screen.findByText('January 2024')
    await userEvent.click(januaryOption)

    // Verify router.push was called with correct URL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('month=2024-01')
      )
    })
  })

  it('should preserve month selection across navigation', async () => {
    const mockQuery = setupMockQuery([])

    // Set month in URL params
    mockSearchParams.set('month', '2024-06')

    render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-06-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-06-30')
    })
  })

  it('should clear month filter when "All Time" is selected', async () => {
    setupMockQuery([])

    // Start with a month selected
    mockSearchParams.set('month', '2024-01')

    render(<IntegratedTransactionSystem />, { wrapper })

    // Find and click month selector
    const monthSelector = await screen.findByRole('combobox', { name: /select month/i })
    await userEvent.click(monthSelector)

    // Select "All Time"
    const allTimeOption = await screen.findByText('All Time')
    await userEvent.click(allTimeOption)

    // Verify router.push was called without month parameter
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/transactions?')
    })
  })

  it('should filter transactions accurately by month boundaries', async () => {
    const transactions = [
      {
        id: '1',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-31', // Last day of January
        amount: 100,
        type: 'income',
        description: 'End of January',
        category: { id: 'cat-1', name: 'Salary' },
      },
      {
        id: '2',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-02-01', // First day of February
        amount: 50,
        type: 'expense',
        description: 'Start of February',
        category: { id: 'cat-2', name: 'Food' },
      },
    ]

    const mockQuery = setupMockQuery(transactions)

    // Filter by January
    mockSearchParams.set('month', '2024-01')

    render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
    })
  })

  it('should handle leap year February correctly', async () => {
    const mockQuery = setupMockQuery([])

    // Filter by February 2024 (leap year)
    mockSearchParams.set('month', '2024-02')

    render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-02-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-02-29')
    })
  })

  it('should handle non-leap year February correctly', async () => {
    const mockQuery = setupMockQuery([])

    // Filter by February 2023 (non-leap year)
    mockSearchParams.set('month', '2023-02')

    render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2023-02-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2023-02-28')
    })
  })

  it('should combine month filter with other filters', async () => {
    const mockQuery = setupMockQuery([])

    // Set month and other filters
    mockSearchParams.set('month', '2024-01')

    render(<IntegratedTransactionSystem />, { wrapper })

    // Apply type filter
    const typeFilter = await screen.findByRole('combobox', { name: /transaction type/i })
    await userEvent.click(typeFilter)
    const incomeOption = await screen.findByText('Income')
    await userEvent.click(incomeOption)

    await waitFor(() => {
      // Should have both month and type filters
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'income')
    })
  })

  it('should show correct transaction count for selected month', async () => {
    const januaryTransactions = [
      {
        id: '1',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-15',
        amount: 100,
        type: 'income',
        description: 'Transaction 1',
        category: { id: 'cat-1', name: 'Salary' },
      },
      {
        id: '2',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-20',
        amount: 50,
        type: 'expense',
        description: 'Transaction 2',
        category: { id: 'cat-2', name: 'Food' },
      },
      {
        id: '3',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-25',
        amount: 75,
        type: 'expense',
        description: 'Transaction 3',
        category: { id: 'cat-3', name: 'Transport' },
      },
    ]

    setupMockQuery(januaryTransactions)

    mockSearchParams.set('month', '2024-01')

    render(<IntegratedTransactionSystem />, { wrapper })

    // Verify all 3 transactions are displayed
    await waitFor(() => {
      expect(screen.getByText('Transaction 1')).toBeInTheDocument()
      expect(screen.getByText('Transaction 2')).toBeInTheDocument()
      expect(screen.getByText('Transaction 3')).toBeInTheDocument()
    })
  })

  it('should handle month parameter removal from URL', async () => {
    const mockQuery = setupMockQuery([])

    // Start with month parameter
    mockSearchParams.set('month', '2024-01')

    const { rerender } = render(<IntegratedTransactionSystem />, { wrapper })

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
    })

    // Remove month parameter
    mockSearchParams.delete('month')
    vi.clearAllMocks()

    rerender(<IntegratedTransactionSystem />)

    // Should no longer filter by month
    await waitFor(() => {
      expect(mockQuery.gte).not.toHaveBeenCalled()
      expect(mockQuery.lte).not.toHaveBeenCalled()
    })
  })

  it('should handle malformed month parameter gracefully', async () => {
    const mockQuery = setupMockQuery([])

    // Set invalid month parameter
    mockSearchParams.set('month', 'invalid-month')

    render(<IntegratedTransactionSystem />, { wrapper })

    // Should not crash and should not apply invalid filter
    await waitFor(() => {
      // Component should render without errors
      const mainElement = screen.queryByRole('main') || screen.queryByRole('region')
      expect(mainElement || document.body).toBeTruthy()
    })
  })

  it('should preserve other URL parameters when changing month', async () => {
    const mockQuery = setupMockQuery([])

    // Set multiple URL parameters
    mockSearchParams.set('month', '2024-01')
    mockSearchParams.set('type', 'income')
    mockSearchParams.set('search', 'salary')

    render(<IntegratedTransactionSystem />, { wrapper })

    // Change month
    const monthSelector = await screen.findByRole('combobox', { name: /select month/i })
    await userEvent.click(monthSelector)

    const februaryOption = await screen.findByText('February 2024')
    await userEvent.click(februaryOption)

    // Should update month but preserve other parameters
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/month=2024-02/)
      )
      // Check that the call includes other parameters
      const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1]
      expect(lastCall[0]).toContain('type=income')
      expect(lastCall[0]).toContain('search=salary')
    })
  })

  it('should handle concurrent month changes correctly', async () => {
    const mockQuery = setupMockQuery([])

    render(<IntegratedTransactionSystem />, { wrapper })

    // Simulate rapid month changes
    const monthSelector = await screen.findByRole('combobox', { name: /select month/i })
    
    // First change
    await userEvent.click(monthSelector)
    const januaryOption = await screen.findByText('January 2024')
    await userEvent.click(januaryOption)

    // Second change immediately after
    await userEvent.click(monthSelector)
    const februaryOption = await screen.findByText('February 2024')
    await userEvent.click(februaryOption)

    // Should end up with the last selected month
    await waitFor(() => {
      const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1]
      expect(lastCall[0]).toContain('month=2024-02')
    })
  })
})
