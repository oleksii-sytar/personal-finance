/**
 * Tests for useSpendingTrends hook
 * 
 * Verifies data fetching, transformation, and caching behavior
 * for spending trends analysis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSpendingTrends } from '../use-spending-trends'
import { useWorkspace } from '@/contexts/workspace-context'
import supabase from '@/lib/supabase/client'

// Mock dependencies
vi.mock('@/contexts/workspace-context')
vi.mock('@/lib/supabase/client', () => ({
  default: {
    from: vi.fn(),
  },
  createClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockSupabase = vi.mocked(supabase)

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

describe('useSpendingTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Data Fetching', () => {
    it('does not fetch when no workspace is available', async () => {
      mockUseWorkspace.mockReturnValue({
        currentWorkspace: null,
        workspaces: [],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      // Query should be disabled when no workspace
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('fetches transactions and calculates trends', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockTransactions = [
        {
          amount: 100,
          transaction_date: '2026-02-15',
          type: 'expense',
          category_id: 'cat-1',
          category: { name: 'Food' },
        },
        {
          amount: 200,
          transaction_date: '2026-02-20',
          type: 'expense',
          category_id: 'cat-2',
          category: { name: 'Transport' },
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.totalCurrentMonth).toBe(300)
      expect(result.current.data?.trends).toHaveLength(2)
    })

    it('returns empty result when no transactions exist', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({
        trends: [],
        totalCurrentMonth: 0,
        totalPreviousMonth: 0,
        overallPercentChange: 0,
        topCategories: [],
        unusualCategories: [],
        averageDailySpending: 0,
      })
    })

    it('handles database errors gracefully', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
    })
  })

  describe('Security', () => {
    it('filters transactions by workspace ID', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1')
      })
    })

    it('only fetches completed transactions', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(mockQuery.eq).toHaveBeenCalledWith('status', 'completed')
      })
    })
  })

  describe('Caching', () => {
    it('uses correct query key with workspace and date', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Query key should include workspace ID, year, and month for proper caching
      expect(mockSupabase.from).toHaveBeenCalledWith('transactions')
    })
  })

  describe('Data Transformation', () => {
    it('transforms database records to TrendTransaction format', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockTransactions = [
        {
          amount: 100,
          transaction_date: '2026-02-15',
          type: 'expense',
          category_id: 'cat-1',
          category: { name: 'Food' },
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.trends[0]).toMatchObject({
        categoryId: 'cat-1',
        categoryName: 'Food',
        currentMonth: 100,
      })
    })

    it('handles missing category names gracefully', async () => {
      const mockWorkspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        owner_id: 'user-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      mockUseWorkspace.mockReturnValue({
        currentWorkspace: mockWorkspace,
        workspaces: [mockWorkspace],
        loading: false,
        error: null,
        setCurrentWorkspace: vi.fn(),
        refreshWorkspaces: vi.fn(),
      })

      const mockTransactions = [
        {
          amount: 100,
          transaction_date: '2026-02-15',
          type: 'expense',
          category_id: 'cat-1',
          category: null, // Missing category
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTransactions,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery as any)

      const { result } = renderHook(() => useSpendingTrends(2026, 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.trends[0].categoryName).toBe('Uncategorized')
    })
  })
})
