/**
 * Tests for useAccountDifference hook
 * 
 * Validates React Query integration for account difference
 * with cache invalidation and refetch behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useAccountDifference,
  useInvalidateAccountDifference,
  useRefetchAccountDifference,
  accountDifferenceKeys,
} from './use-account-difference'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { AccountBalance } from '@/actions/balance-reconciliation'

// Mock the balance reconciliation actions
vi.mock('@/actions/balance-reconciliation', () => ({
  getAccountDifference: vi.fn(),
}))

describe('useAccountDifference', () => {
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
    it('should fetch account difference successfully', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance,
      })

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAccountBalance)
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledWith('account-1')
    })

    it('should handle error responses', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Account not found',
      })

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper: createWrapper() }
      )

      // Wait for all retries to complete (initial + 3 retries = 4 calls)
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(result.current.error).toBeDefined()
      expect(result.current.error?.message).toBe('Account not found')
      // Should have retried 3 times (4 total calls)
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout for this test

    it('should handle missing data', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: undefined,
      } as any)

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper: createWrapper() }
      )

      // Wait for all retries to complete
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(result.current.error?.message).toBe('No data returned from account difference')
    }, 15000) // 15 second timeout for this test
  })

  describe('Query Configuration', () => {
    it('should respect enabled option', async () => {
      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1', enabled: false }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })

      expect(balanceReconciliationActions.getAccountDifference).not.toHaveBeenCalled()
    })

    it('should not fetch when accountId is empty', async () => {
      const { result } = renderHook(
        () => useAccountDifference({ accountId: '' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe('idle')
      })

      expect(balanceReconciliationActions.getAccountDifference).not.toHaveBeenCalled()
    })

    it('should use custom staleTime', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1000,
        calculated_balance: 1000,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance,
      })

      const { result } = renderHook(
        () =>
          useAccountDifference({
            accountId: 'account-1',
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
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1000,
        calculated_balance: 1000,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance,
      })

      const wrapper = createWrapper()
      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check that data is cached with correct key
      const cachedData = queryClient.getQueryData(
        accountDifferenceKeys.account('account-1')
      )
      expect(cachedData).toEqual(mockAccountBalance)
    })

    it('should cache data for different accounts separately', async () => {
      const mockBalance1: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const mockBalance2: AccountBalance = {
        account_id: 'account-2',
        opening_balance: 2000,
        current_balance: 2200,
        calculated_balance: 2000,
        difference: 200,
        currency: 'USD',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: mockBalance1 })
        .mockResolvedValueOnce({ data: mockBalance2 })

      const wrapper = createWrapper()

      // Fetch for account-1
      const { result: result1 } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Fetch for account-2
      const { result: result2 } = renderHook(
        () => useAccountDifference({ accountId: 'account-2' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true)
      })

      // Both should have different data
      expect(result1.current.data?.difference).toBe(100)
      expect(result2.current.data?.difference).toBe(200)
      expect(result1.current.data?.currency).toBe('UAH')
      expect(result2.current.data?.currency).toBe('USD')
    })
  })

  describe('useInvalidateAccountDifference', () => {
    it('should invalidate account difference cache', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance,
      })

      const wrapper = createWrapper()

      // First, fetch the data
      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      // Now invalidate
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      // Query should be invalidated and refetch
      await waitFor(() => {
        expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(2)
      })
    })

    it('should only invalidate specific account cache', async () => {
      const mockBalance1: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const mockBalance2: AccountBalance = {
        account_id: 'account-2',
        opening_balance: 2000,
        current_balance: 2200,
        calculated_balance: 2000,
        difference: 200,
        currency: 'USD',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: mockBalance1 })
        .mockResolvedValueOnce({ data: mockBalance2 })
        .mockResolvedValueOnce({ data: { ...mockBalance1, difference: 150 } })

      const wrapper = createWrapper()

      // Fetch for both accounts
      const { result: result1 } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      const { result: result2 } = renderHook(
        () => useAccountDifference({ accountId: 'account-2' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
        expect(result2.current.isSuccess).toBe(true)
      })

      // Invalidate only account-1
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      // Only account-1 should refetch
      await waitFor(() => {
        expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(3)
      })

      // Verify account-1 was called twice, account-2 only once
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenNthCalledWith(1, 'account-1')
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenNthCalledWith(2, 'account-2')
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenNthCalledWith(3, 'account-1')
    })
  })

  describe('useRefetchAccountDifference', () => {
    it('should refetch account difference', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        data: mockAccountBalance,
      })

      const wrapper = createWrapper()

      // First, fetch the data
      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      // Now refetch
      const { result: refetchResult } = renderHook(
        () => useRefetchAccountDifference(),
        { wrapper }
      )

      refetchResult.current('account-1')

      // Query should refetch
      await waitFor(() => {
        expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Error Handling', () => {
    it('should retry failed requests', async () => {
      const mockAccountBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1000,
        calculated_balance: 1000,
        difference: 0,
        currency: 'UAH',
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ data: mockAccountBalance })

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper: createWrapper() }
      )

      // Should retry 3 times before succeeding
      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout

    it('should fail after max retries', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockResolvedValue({
        error: 'Persistent error',
      })

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper: createWrapper() }
      )

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true)
        },
        { timeout: 10000, interval: 100 }
      )

      // Should have tried 4 times (initial + 3 retries)
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(4)
    }, 15000) // 15 second timeout
  })

  describe('Loading States', () => {
    it('should show loading state initially', async () => {
      vi.mocked(balanceReconciliationActions.getAccountDifference).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    account_id: 'account-1',
                    opening_balance: 1000,
                    current_balance: 1000,
                    calculated_balance: 1000,
                    difference: 0,
                    currency: 'UAH',
                    is_reconciled: true,
                  },
                }),
              100
            )
          )
      )

      const { result } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
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
      expect(accountDifferenceKeys.all).toEqual(['account-difference'])
      expect(accountDifferenceKeys.account('account-1')).toEqual([
        'account-difference',
        'account-1',
      ])
    })
  })

  describe('Real-Time Updates Simulation', () => {
    it('should update when current balance changes (Requirement 7.4)', async () => {
      const initialBalance: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const updatedBalance: AccountBalance = {
        ...initialBalance,
        current_balance: 1000,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: updatedBalance })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)

      // Simulate balance update by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(0)
      })

      expect(differenceResult.current.data?.is_reconciled).toBe(true)
    })

    it('should update when transaction is created (Requirement 7.1)', async () => {
      const beforeTransaction: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const afterTransaction: AccountBalance = {
        ...beforeTransaction,
        calculated_balance: 1100,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: beforeTransaction })
        .mockResolvedValueOnce({ data: afterTransaction })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)

      // Simulate transaction creation by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(0)
      })

      expect(differenceResult.current.data?.calculated_balance).toBe(1100)
    })

    it('should update when transaction is edited (Requirement 7.2)', async () => {
      const beforeEdit: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1050,
        difference: 50,
        currency: 'UAH',
        is_reconciled: false,
      }

      const afterEdit: AccountBalance = {
        ...beforeEdit,
        calculated_balance: 1100,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: beforeEdit })
        .mockResolvedValueOnce({ data: afterEdit })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(50)

      // Simulate transaction edit by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(0)
      })
    })

    it('should update when transaction is deleted (Requirement 7.3)', async () => {
      const beforeDelete: AccountBalance = {
        account_id: 'account-1',
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1200,
        difference: -100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const afterDelete: AccountBalance = {
        ...beforeDelete,
        calculated_balance: 1100,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: beforeDelete })
        .mockResolvedValueOnce({ data: afterDelete })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId: 'account-1' }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(-100)

      // Simulate transaction deletion by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current('account-1')

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(0)
      })
    })
  })
})
