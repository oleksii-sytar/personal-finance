/**
 * Unit tests for month filtering in useTransactions hook
 * Requirements 4.2: Month filtering logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTransactions } from '@/hooks/use-transactions'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import supabase from '@/lib/supabase/client'
import type { ReactNode } from 'react'

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

// Mock workspace context
const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  owner_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('useTransactions - Month Filtering', () => {
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
  })

  const wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <WorkspaceProvider initialWorkspace={mockWorkspace}>
          {children}
        </WorkspaceProvider>
      </QueryClientProvider>
    )
  }

  it('should filter transactions by month (YYYY-MM format)', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    const mockTransactions = [
      {
        id: '1',
        workspace_id: mockWorkspace.id,
        transaction_date: '2024-01-15',
        amount: 100,
        type: 'income',
        description: 'January transaction',
        category: { id: 'cat-1', name: 'Salary' },
      },
    ]

    mockQuery.lte.mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    const { result } = renderHook(
      () => useTransactions({ month: '2024-01' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Verify the query was called with correct date range
    expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
    expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
  })

  it('should handle February correctly (28 days)', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: [],
      error: null,
    })

    renderHook(
      () => useTransactions({ month: '2023-02' }), // Non-leap year
      { wrapper }
    )

    await waitFor(() => {
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2023-02-28')
    })
  })

  it('should handle February in leap year correctly (29 days)', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: [],
      error: null,
    })

    renderHook(
      () => useTransactions({ month: '2024-02' }), // Leap year
      { wrapper }
    )

    await waitFor(() => {
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-02-29')
    })
  })

  it('should handle December correctly (31 days)', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: [],
      error: null,
    })

    renderHook(
      () => useTransactions({ month: '2024-12' }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-12-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-12-31')
    })
  })

  it('should prioritize month filter over startDate/endDate', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: [],
      error: null,
    })

    renderHook(
      () =>
        useTransactions({
          month: '2024-01',
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        }),
      { wrapper }
    )

    await waitFor(() => {
      // Should use month filter, not startDate/endDate
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
    })
  })

  it('should use startDate/endDate when month filter is not present', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    mockQuery.lte.mockResolvedValue({
      data: [],
      error: null,
    })

    renderHook(
      () =>
        useTransactions({
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-06-30'),
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-06-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-06-30')
    })
  })

  it('should combine month filter with other filters (type, categories)', async () => {
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
      data: [],
      error: null,
    })

    renderHook(
      () =>
        useTransactions({
          month: '2024-01',
          type: 'income',
          categories: ['cat-1', 'cat-2'],
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(mockQuery.gte).toHaveBeenCalledWith('transaction_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('transaction_date', '2024-01-31')
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'income')
      expect(mockQuery.in).toHaveBeenCalledWith('category_id', ['cat-1', 'cat-2'])
    })
  })

  it('should return all transactions when no month filter is provided', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

    const mockTransactions = [
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
        transaction_date: '2024-06-20',
        amount: 200,
        type: 'expense',
        description: 'Transaction 2',
        category: { id: 'cat-2', name: 'Food' },
      },
    ]

    mockQuery.order.mockResolvedValue({
      data: mockTransactions,
      error: null,
    })

    const { result } = renderHook(() => useTransactions(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.data).toHaveLength(2)
    })
  })
})
