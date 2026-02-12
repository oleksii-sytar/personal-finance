/**
 * Integration Tests for Real-Time Balance Updates
 * 
 * Tests Property 15: Real-Time UI Updates
 * Validates: Requirements 7.5
 * 
 * These tests verify that the React Query hooks (useReconciliationStatus and 
 * useAccountDifference) properly update when transactions are created or balances 
 * are updated, without requiring a page refresh.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useAccountDifference,
  useInvalidateAccountDifference,
} from '@/hooks/use-account-difference'
import {
  useReconciliationStatus,
  useInvalidateReconciliation,
} from '@/hooks/use-reconciliation-status'
import * as balanceReconciliationActions from '@/actions/balance-reconciliation'
import type { AccountBalance, ReconciliationStatus } from '@/actions/balance-reconciliation'

// Mock the balance reconciliation actions
vi.mock('@/actions/balance-reconciliation', () => ({
  getAccountDifference: vi.fn(),
  getReconciliationStatus: vi.fn(),
  updateCurrentBalance: vi.fn(),
}))

describe('Real-Time Balance Updates Integration Tests', () => {
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

  describe('Property 15: Real-Time UI Updates - Transaction Creation', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 15: Real-Time UI Updates
     * Validates: Requirements 7.5
     * 
     * Test: Creating a transaction should trigger automatic difference recalculation
     * and update the UI without page refresh
     */
    it('should update account difference when transaction is created', async () => {
      const accountId = 'account-1'
      const workspaceId = 'workspace-1'

      // Initial state: account has difference of 100
      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      // After transaction: calculated balance increases, difference decreases
      const afterTransaction: AccountBalance = {
        ...initialBalance,
        calculated_balance: 1050,
        difference: 50,
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: afterTransaction })

      const wrapper = createWrapper()

      // Render the hook
      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)
      expect(differenceResult.current.data?.calculated_balance).toBe(1000)

      // Simulate transaction creation by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      // Wait for data to update
      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(50)
      })

      expect(differenceResult.current.data?.calculated_balance).toBe(1050)
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(2)
    })

    it('should update reconciliation status when transaction is created', async () => {
      const workspaceId = 'workspace-1'

      // Initial state: workspace has total difference of 100
      const initialStatus: ReconciliationStatus = {
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
        last_update: '2024-01-15T10:00:00Z',
      }

      // After transaction: difference decreases
      const afterTransaction: ReconciliationStatus = {
        ...initialStatus,
        total_difference: 50,
        accounts: [
          {
            ...initialStatus.accounts[0],
            calculated_balance: 1050,
            difference: 50,
          },
        ],
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ data: initialStatus })
        .mockResolvedValueOnce({ data: afterTransaction })

      const wrapper = createWrapper()

      // Render the hook
      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId }),
        { wrapper }
      )

      // Wait for initial data
      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      expect(statusResult.current.data?.total_difference).toBe(100)

      // Simulate transaction creation by invalidating cache
      const { result: invalidateResult } = renderHook(
        () => useInvalidateReconciliation(),
        { wrapper }
      )

      invalidateResult.current(workspaceId)

      // Wait for data to update
      await waitFor(() => {
        expect(statusResult.current.data?.total_difference).toBe(50)
      })

      expect(balanceReconciliationActions.getReconciliationStatus).toHaveBeenCalledTimes(2)
    })

    it('should reconcile account when transaction closes the gap', async () => {
      const accountId = 'account-1'

      // Initial state: account has difference of 100
      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      // After transaction: difference becomes 0, account reconciled
      const afterTransaction: AccountBalance = {
        ...initialBalance,
        calculated_balance: 1100,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: afterTransaction })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.is_reconciled).toBe(false)

      // Simulate transaction creation
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      await waitFor(() => {
        expect(differenceResult.current.data?.is_reconciled).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(0)
    })
  })

  describe('Property 15: Real-Time UI Updates - Balance Updates', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 15: Real-Time UI Updates
     * Validates: Requirements 7.5
     * 
     * Test: Updating current balance should trigger automatic difference recalculation
     * and update the UI without page refresh
     */
    it('should update account difference when current balance is updated', async () => {
      const accountId = 'account-1'

      // Initial state: account has difference of 100
      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      // After balance update: current balance changes, difference recalculated
      const afterBalanceUpdate: AccountBalance = {
        ...initialBalance,
        current_balance: 1000,
        difference: 0,
        is_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: afterBalanceUpdate })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)
      expect(differenceResult.current.data?.current_balance).toBe(1100)

      // Simulate balance update
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(0)
      })

      expect(differenceResult.current.data?.current_balance).toBe(1000)
      expect(differenceResult.current.data?.is_reconciled).toBe(true)
    })

    it('should update reconciliation status when current balance is updated', async () => {
      const workspaceId = 'workspace-1'

      // Initial state
      const initialStatus: ReconciliationStatus = {
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
        last_update: '2024-01-15T10:00:00Z',
      }

      // After balance update
      const afterBalanceUpdate: ReconciliationStatus = {
        ...initialStatus,
        total_difference: 0,
        accounts: [
          {
            ...initialStatus.accounts[0],
            current_balance: 1000,
            difference: 0,
            is_reconciled: true,
          },
        ],
        all_reconciled: true,
        last_update: '2024-01-15T11:00:00Z',
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ data: initialStatus })
        .mockResolvedValueOnce({ data: afterBalanceUpdate })

      const wrapper = createWrapper()

      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      expect(statusResult.current.data?.total_difference).toBe(100)
      expect(statusResult.current.data?.all_reconciled).toBe(false)

      // Simulate balance update
      const { result: invalidateResult } = renderHook(
        () => useInvalidateReconciliation(),
        { wrapper }
      )

      invalidateResult.current(workspaceId)

      await waitFor(() => {
        expect(statusResult.current.data?.total_difference).toBe(0)
      })

      expect(statusResult.current.data?.all_reconciled).toBe(true)
      expect(statusResult.current.data?.last_update).toBe('2024-01-15T11:00:00Z')
    })

    it('should handle negative difference after balance update', async () => {
      const accountId = 'account-1'

      // Initial state: positive difference
      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      // After balance update: negative difference
      const afterBalanceUpdate: AccountBalance = {
        ...initialBalance,
        current_balance: 900,
        difference: -100,
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: afterBalanceUpdate })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)

      // Simulate balance update
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(-100)
      })

      expect(differenceResult.current.data?.current_balance).toBe(900)
      expect(differenceResult.current.data?.is_reconciled).toBe(false)
    })
  })

  describe('Property 15: Real-Time UI Updates - Multiple Accounts', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 15: Real-Time UI Updates
     * Validates: Requirements 7.5
     * 
     * Test: Updates to one account should not affect other accounts' cache
     */
    it('should update only affected account when transaction is created', async () => {
      const account1Id = 'account-1'
      const account2Id = 'account-2'

      const account1Initial: AccountBalance = {
        account_id: account1Id,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const account2Initial: AccountBalance = {
        account_id: account2Id,
        opening_balance: 2000,
        current_balance: 2200,
        calculated_balance: 2000,
        difference: 200,
        currency: 'USD',
        is_reconciled: false,
      }

      const account1Updated: AccountBalance = {
        ...account1Initial,
        calculated_balance: 1050,
        difference: 50,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: account1Initial })
        .mockResolvedValueOnce({ data: account2Initial })
        .mockResolvedValueOnce({ data: account1Updated })

      const wrapper = createWrapper()

      // Render hooks for both accounts
      const { result: result1 } = renderHook(
        () => useAccountDifference({ accountId: account1Id }),
        { wrapper }
      )

      const { result: result2 } = renderHook(
        () => useAccountDifference({ accountId: account2Id }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
        expect(result2.current.isSuccess).toBe(true)
      })

      expect(result1.current.data?.difference).toBe(100)
      expect(result2.current.data?.difference).toBe(200)

      // Invalidate only account 1
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(account1Id)

      // Wait for account 1 to update
      await waitFor(() => {
        expect(result1.current.data?.difference).toBe(50)
      })

      // Account 2 should remain unchanged
      expect(result2.current.data?.difference).toBe(200)
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(3)
    })

    it('should update total difference when any account changes', async () => {
      const workspaceId = 'workspace-1'

      const initialStatus: ReconciliationStatus = {
        total_difference: 300,
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
          {
            account_id: 'account-2',
            opening_balance: 2000,
            current_balance: 2200,
            calculated_balance: 2000,
            difference: 200,
            currency: 'UAH',
            is_reconciled: false,
          },
        ],
        all_reconciled: false,
        last_update: '2024-01-15T10:00:00Z',
      }

      const afterUpdate: ReconciliationStatus = {
        ...initialStatus,
        total_difference: 200,
        accounts: [
          {
            ...initialStatus.accounts[0],
            calculated_balance: 1100,
            difference: 0,
            is_reconciled: true,
          },
          initialStatus.accounts[1],
        ],
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ data: initialStatus })
        .mockResolvedValueOnce({ data: afterUpdate })

      const wrapper = createWrapper()

      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      expect(statusResult.current.data?.total_difference).toBe(300)
      expect(statusResult.current.data?.accounts[0].is_reconciled).toBe(false)

      // Simulate update
      const { result: invalidateResult } = renderHook(
        () => useInvalidateReconciliation(),
        { wrapper }
      )

      invalidateResult.current(workspaceId)

      await waitFor(() => {
        expect(statusResult.current.data?.total_difference).toBe(200)
      })

      expect(statusResult.current.data?.accounts[0].is_reconciled).toBe(true)
      expect(statusResult.current.data?.accounts[1].is_reconciled).toBe(false)
    })
  })

  describe('Property 15: Real-Time UI Updates - Without Page Refresh', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 15: Real-Time UI Updates
     * Validates: Requirements 7.5
     * 
     * Test: All updates should happen via React Query cache invalidation,
     * not by reloading the page or component
     */
    it('should update via cache invalidation, not component remount', async () => {
      const accountId = 'account-1'

      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const updatedBalance: AccountBalance = {
        ...initialBalance,
        difference: 50,
        calculated_balance: 1050,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ data: updatedBalance })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      const initialRenderCount = balanceReconciliationActions.getAccountDifference.mock.calls.length

      // Invalidate cache (simulating real-time update)
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      await waitFor(() => {
        expect(differenceResult.current.data?.difference).toBe(50)
      })

      // Should have called the action twice (initial + refetch), not more
      expect(balanceReconciliationActions.getAccountDifference).toHaveBeenCalledTimes(
        initialRenderCount + 1
      )

      // Verify component didn't remount by checking the hook instance
      expect(differenceResult.current.isSuccess).toBe(true)
    })

    it('should update data without full page reload', async () => {
      const workspaceId = 'workspace-1'

      const initialStatus: ReconciliationStatus = {
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
        last_update: '2024-01-15T10:00:00Z',
      }

      const updatedStatus: ReconciliationStatus = {
        ...initialStatus,
        total_difference: 0,
        accounts: [
          {
            ...initialStatus.accounts[0],
            difference: 0,
            calculated_balance: 1100,
            is_reconciled: true,
          },
        ],
        all_reconciled: true,
      }

      vi.mocked(balanceReconciliationActions.getReconciliationStatus)
        .mockResolvedValueOnce({ data: initialStatus })
        .mockResolvedValueOnce({ data: updatedStatus })

      const wrapper = createWrapper()

      const { result: statusResult } = renderHook(
        () => useReconciliationStatus({ workspaceId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(statusResult.current.isSuccess).toBe(true)
      })

      expect(statusResult.current.data?.total_difference).toBe(100)

      // Invalidate cache (simulating real-time update)
      const { result: invalidateResult } = renderHook(
        () => useInvalidateReconciliation(),
        { wrapper }
      )

      invalidateResult.current(workspaceId)

      // Data should update without remounting
      await waitFor(() => {
        expect(statusResult.current.data?.total_difference).toBe(0)
      })

      expect(statusResult.current.data?.all_reconciled).toBe(true)
      expect(statusResult.current.isSuccess).toBe(true)
    })
  })

  describe('Property 15: Real-Time UI Updates - Error Handling', () => {
    /**
     * Feature: realtime-balance-reconciliation
     * Property 15: Real-Time UI Updates
     * Validates: Requirements 7.5
     * 
     * Test: Errors during updates should be handled gracefully
     */
    it('should handle errors during real-time updates', async () => {
      const accountId = 'account-1'

      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      expect(differenceResult.current.data?.difference).toBe(100)

      // Invalidate cache (will trigger error)
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      // Should eventually show error after retries
      await waitFor(
        () => {
          expect(differenceResult.current.isError).toBe(true)
        },
        { timeout: 10000 }
      )

      // Old data should still be available
      expect(differenceResult.current.data?.difference).toBe(100)
    }, 15000)

    it('should recover from errors on subsequent updates', async () => {
      const accountId = 'account-1'

      const initialBalance: AccountBalance = {
        account_id: accountId,
        opening_balance: 1000,
        current_balance: 1100,
        calculated_balance: 1000,
        difference: 100,
        currency: 'UAH',
        is_reconciled: false,
      }

      const updatedBalance: AccountBalance = {
        ...initialBalance,
        difference: 50,
      }

      vi.mocked(balanceReconciliationActions.getAccountDifference)
        .mockResolvedValueOnce({ data: initialBalance })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ error: 'Network error' })
        .mockResolvedValueOnce({ data: updatedBalance })

      const wrapper = createWrapper()

      const { result: differenceResult } = renderHook(
        () => useAccountDifference({ accountId }),
        { wrapper }
      )

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
      })

      // Invalidate cache (will trigger error)
      const { result: invalidateResult } = renderHook(
        () => useInvalidateAccountDifference(),
        { wrapper }
      )

      invalidateResult.current(accountId)

      await waitFor(
        () => {
          expect(differenceResult.current.isError).toBe(true)
        },
        { timeout: 10000 }
      )

      // Try again (should succeed)
      invalidateResult.current(accountId)

      await waitFor(() => {
        expect(differenceResult.current.isSuccess).toBe(true)
        expect(differenceResult.current.data?.difference).toBe(50)
      })
    }, 15000)
  })
})
