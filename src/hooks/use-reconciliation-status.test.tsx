/**
 * Tests for useReconciliationStatus hook
 * 
 * Validates React Query integration for reconciliation status
 * with cache invalidation and refetch behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useReconciliationStatus,
  useInvalidateReconciliation,
  useRefetchReconciliation,
  reconciliationKeys,
} from './use-reconciliation-status'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { ReconciliationStatus } from '@/actions/balance-reconciliation'

// Mock the balance reconciliation actions
vi.mock('@/actions/balance-reconciliation', () => ({
  getReconciliationStatus: vi.fn(),
}))

describe('useReconciliationStatus', () => {
  let queryClient: QueryClient

  // Test wrapper with QueryClient provider
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    })

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    Wrapper.displayName = 'TestWrapper'
    return Wrapper
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Basic Functionality', () => {
    it('should fetch reconciliation status successfully', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [
          {
            account_id: 'account-1',
            opening_balance: 1000,
            current_balance: 1100,
            calculated_balance: 1000,
            difference: 100,
            currency: 'UAH',
            is_reconciled: false,
          },
        ],
        all_reconciled: false,
        last_update: '2024-01-01T00:00:00Z',
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStatus)
      expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledWith(
        'workspace-1'
      )
    })

    it('should handle error responses', async () => {
      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        error: 'Failed to fetch reconciliation status',
      })

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      // Wait for all retries to complete (initial + 3 retries = 4 calls)
      // React Query retries with exponential backoff: 1s, 2s, 4s
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Failed to fetch reconciliation status')
      // Should have retried 3 times (4 total calls)
      expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout for this test

    it('should handle missing data', async () => {
      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: undefined,
      } as any)

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      // Wait for all retries to complete
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(result.current.error?.message).toBe('No data returned from reconciliation status')
    }, 15000) // 15 second timeout for this test
  })

  describe('Query Configuration', () => {
    it('should respect enabled option', async () => {
      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1', enabled: false }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })

      expect(balanceReconciliationActions.getReconciliationStatus).not.toHaveBeenCalled()
    })

    it('should not fetch when workspaceId is empty', async () => {
      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: '' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })

      expect(balanceReconciliationActions.getReconciliationStatus).not.toHaveBeenCalled()
    })

    it('should use custom staleTime', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      const { result } = renderHook(
        () =>
          useReconciliationStatus({
            workspaceId: 'workspace-1',
            staleTime: 60000, // 1 minute
          }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Query should be fresh for 1 minute
      expect(result.current.isStale).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should use correct query key', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 0,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: true,
        last_update: null,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that data is cached with correct key
      const cachedData = queryClient.getQueryData(
        reconciliationKeys.status('workspace-1')
      )
      expect(cachedData).toEqual(mockStatus)
    })

    it('should cache data for different workspaces separately', async () => {
      const mockStatus1: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      const mockStatus2: ReconciliationStatus = {
        total_difference: 200,
        total_difference_currency: 'USD',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ data: mockStatus1 })
        .mockResolvedValueOnce({ data: mockStatus2 })

      const wrapper = createWrapper()

      // Fetch for workspace-1
      const { result: result1 } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Fetch for workspace-2
      const { result: result2 } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-2' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true)
      })

      // Both should have different data
      expect(result1.current.data?.total_difference).toBe(100)
      expect(result2.current.data?.total_difference).toBe(200)
    })
  })

  describe('useInvalidateReconciliation', () => {
    it('should invalidate reconciliation cache', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      const wrapper = createWrapper()

      // First, fetch the data
      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      // Now invalidate
      const { result: invalidateResult } = renderHook(
        () => useInvalidateReconciliation(),
        { wrapper }
      )

      invalidateResult.current('workspace-1')

      // Query should be invalidated and refetch
      await waitFor(() => {
        expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('useRefetchReconciliation', () => {
    it('should refetch reconciliation status', async () => {
      const mockStatus: ReconciliationStatus = {
        total_difference: 100,
        total_difference_currency: 'UAH',
        accounts: [],
        all_reconciled: false,
        last_update: null,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        data: mockStatus,
      })

      const wrapper = createWrapper()

      // First, fetch the data
      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      // Now refetch
      const { result: refetchResult } = renderHook(
        () => useRefetchReconciliation(),
        { wrapper }
      )

      refetchResult.current('workspace-1')

      // Query should refetch
      await waitFor(() => {
        expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should retry failed requests', async () => {
      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({
          data: {
            total_difference: 0,
            total_difference_currency: 'UAH',
            accounts: [],
            all_reconciled: true,
            last_update: null,
          },
        })

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      // Should retry 3 times before succeeding
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout

    it('should fail after max retries', async () => {
      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockResolvedValue({
        error: 'Persistent error',
      })

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      // Should have tried 4 times (initial + 3 retries)
      expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      vi.mocked(balanceReconciliationActions.getReconciliationStatus).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    total_difference: 0,
                    total_difference_currency: 'UAH',
                    accounts: [],
                    all_reconciled: true,
                    last_update: null,
                  },
                }),
              100
            )
          )
      )

      const { result } = renderHook(
        () => useReconciliationStatus({ workspaceId: 'workspace-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeDefined()
    })
  })

  describe('Query Keys', () => {
    it('should generate correct query keys', () => {
      expect(reconciliationKeys.all).toEqual(['reconciliation'])
      expect(reconciliationKeys.status('workspace-1')).toEqual([
        'reconciliation',
        'status',
        'workspace-1',
      ])
    })
  })
})
