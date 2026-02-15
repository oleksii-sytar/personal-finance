/**
 * Tests for ForecastService
 * 
 * Tests caching behavior, data fetching, error handling, and cache invalidation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ForecastService } from '@/lib/services/forecast-service'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock calculation functions
vi.mock('@/lib/calculations/daily-forecast', () => ({
  calculateDailyForecast: vi.fn((
    currentBalance,
    historicalTransactions,
    plannedTransactions,
    startDate,
    endDate,
    userSettings
  ) => ({
    forecasts: [
      {
        date: '2026-02-15',
        projectedBalance: 4500,
        confidence: 'high' as const,
        riskLevel: 'safe' as const,
        breakdown: {
          startingBalance: currentBalance,
          plannedIncome: 0,
          plannedExpenses: 0,
          estimatedDailySpending: 100,
          endingBalance: 4500,
        },
      },
    ],
    averageDailySpending: 100,
    spendingConfidence: 'high' as const,
    shouldDisplay: true,
  })),
}))

vi.mock('@/lib/calculations/payment-risk-assessment', () => ({
  assessPaymentRisks: vi.fn(() => [
    {
      transaction: {
        id: 'planned-1',
        amount: 500,
        description: 'Rent',
        type: 'expense',
        status: 'planned',
        transaction_date: new Date('2026-02-20'),
        planned_date: new Date('2026-02-20'),
      },
      daysUntil: 5,
      projectedBalanceAtDate: 4500,
      balanceAfterPayment: 4000,
      riskLevel: 'safe' as const,
      recommendation: 'Sufficient funds available',
      canAfford: true,
    },
  ]),
}))

describe('ForecastService', () => {
  let service: ForecastService

  beforeEach(() => {
    service = new ForecastService()
    vi.clearAllMocks()

    // Setup default mock responses
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    // Helper to create chainable query methods with proper typing
    const createChain = (finalData: any): any => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        is: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve(finalData)),
        single: vi.fn(() => Promise.resolve(finalData)),
      }
      return chain
    }

    // Mock database queries
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        // Return different data based on query parameters
        // We'll use a simple approach: return historical data by default
        return createChain({
          data: [
            {
              amount: 100,
              transaction_date: '2026-01-15',
              type: 'expense',
            },
            {
              amount: 150,
              transaction_date: '2026-01-20',
              type: 'expense',
            },
          ],
          error: null,
        })
      }

      if (table === 'user_settings') {
        return createChain({
          data: {
            minimum_safe_balance: 1000,
            safety_buffer_days: 7,
          },
          error: null,
        })
      }

      if (table === 'account_actual_balances') {
        return createChain({
          data: { actual_balance: 5000 },
          error: null,
        })
      }

      // Default: return empty data
      return createChain({
        data: [],
        error: null,
      })
    })
  })

  afterEach(() => {
    service.clearCache()
  })

  describe('getForecast', () => {
    it('should fetch and calculate forecast successfully', async () => {
      const result = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      expect(result).toBeDefined()
      expect(result.forecast).toBeDefined()
      expect(result.forecast.forecasts).toHaveLength(1)
      expect(result.forecast.shouldDisplay).toBe(true)
      expect(result.paymentRisks).toHaveLength(1)
      expect(result.currentBalance).toBe(5000)
      expect(result.userSettings).toEqual({
        minimumSafeBalance: 1000,
        safetyBufferDays: 7,
      })
    })

    it('should use provided settings over user settings', async () => {
      const result = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        minimumSafeBalance: 2000,
        safetyBufferDays: 14,
      })

      expect(result.userSettings).toEqual({
        minimumSafeBalance: 2000,
        safetyBufferDays: 14,
      })
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await expect(
        service.getForecast('workspace-1', 'account-1', {
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        })
      ).rejects.toThrow('User not authenticated')
    })

    it('should throw error if historical transactions fetch fails', async () => {
      const createChain = (finalData: any): any => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          is: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve(finalData)),
          single: vi.fn(() => Promise.resolve(finalData)),
        }
        return chain
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'transactions') {
          return createChain({
            data: null,
            error: { message: 'Database error' },
          })
        }
        return createChain({ data: [], error: null })
      })

      await expect(
        service.getForecast('workspace-1', 'account-1', {
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        })
      ).rejects.toThrow('Failed to fetch historical transactions')
    })

    it('should throw error if current balance fetch fails', async () => {
      const createChain = (finalData: any): any => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          is: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve(finalData)),
          single: vi.fn(() => Promise.resolve(finalData)),
        }
        return chain
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'account_actual_balances') {
          return createChain({
            data: null,
            error: { message: 'Balance not found' },
          })
        }
        if (table === 'transactions') {
          return createChain({
            data: [
              { amount: 100, transaction_date: '2026-01-15', type: 'expense' },
            ],
            error: null,
          })
        }
        if (table === 'user_settings') {
          return createChain({
            data: { minimum_safe_balance: 1000, safety_buffer_days: 7 },
            error: null,
          })
        }
        return createChain({ data: [], error: null })
      })

      await expect(
        service.getForecast('workspace-1', 'account-1', {
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        })
      ).rejects.toThrow('Failed to fetch current balance')
    })

    it('should use default settings if user settings not found', async () => {
      const createChain = (finalData: any): any => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          is: vi.fn(() => chain),
          order: vi.fn(() => Promise.resolve(finalData)),
          single: vi.fn(() => Promise.resolve(finalData)),
        }
        return chain
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'user_settings') {
          return createChain({
            data: null,
            error: { message: 'Not found' },
          })
        }
        if (table === 'transactions') {
          return createChain({
            data: [
              { amount: 100, transaction_date: '2026-01-15', type: 'expense' },
            ],
            error: null,
          })
        }
        if (table === 'account_actual_balances') {
          return createChain({
            data: { actual_balance: 5000 },
            error: null,
          })
        }
        return createChain({ data: [], error: null })
      })

      const result = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      expect(result.userSettings).toEqual({
        minimumSafeBalance: 1000,
        safetyBufferDays: 7,
      })
    })
  })

  describe('caching', () => {
    it('should cache forecast results', async () => {
      // First call - should fetch from database
      const result1 = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Clear mock call history
      vi.clearAllMocks()

      // Second call - should use cache
      const result2 = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should not have called database again
      expect(mockSupabase.from).not.toHaveBeenCalled()

      // Results should be identical
      expect(result2).toEqual(result1)
    })

    it('should expire cache after TTL', async () => {
      // First call
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Fast-forward time by 6 minutes (beyond 5-minute TTL)
      vi.useFakeTimers()
      vi.advanceTimersByTime(6 * 60 * 1000)

      // Clear mock call history
      vi.clearAllMocks()

      // Second call - should fetch from database again
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database again
      expect(mockSupabase.from).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should cache separately for different accounts', async () => {
      // Fetch for account-1
      const result1 = await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch for account-2 - should not use cache
      await service.getForecast('workspace-1', 'account-2', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database for account-2
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should cache separately for different workspaces', async () => {
      // Fetch for workspace-1
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch for workspace-2 - should not use cache
      await service.getForecast('workspace-2', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database for workspace-2
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })

  describe('cache invalidation', () => {
    it('should invalidate cache for specific account', async () => {
      // First call - populate cache
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Invalidate cache
      service.invalidateCache('workspace-1', 'account-1')

      // Clear mock call history
      vi.clearAllMocks()

      // Second call - should fetch from database again
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database again
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should not affect cache for other accounts', async () => {
      // Populate cache for both accounts
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
      await service.getForecast('workspace-1', 'account-2', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Invalidate only account-1
      service.invalidateCache('workspace-1', 'account-1')

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch account-2 - should use cache
      await service.getForecast('workspace-1', 'account-2', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should not have called database
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should invalidate all cache entries for workspace', async () => {
      // Populate cache for multiple accounts
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
      await service.getForecast('workspace-1', 'account-2', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
      await service.getForecast('workspace-2', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Invalidate all workspace-1 cache
      service.invalidateWorkspaceCache('workspace-1')

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch workspace-1 accounts - should fetch from database
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
      await service.getForecast('workspace-1', 'account-2', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database for both
      expect(mockSupabase.from).toHaveBeenCalled()

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch workspace-2 - should still use cache
      await service.getForecast('workspace-2', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should not have called database
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should clear all cache entries', async () => {
      // Populate cache for multiple workspaces and accounts
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })
      await service.getForecast('workspace-2', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Clear all cache
      service.clearCache()

      // Clear mock call history
      vi.clearAllMocks()

      // Fetch any account - should fetch from database
      await service.getForecast('workspace-1', 'account-1', {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
      })

      // Should have called database
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should provide context in error messages', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error')
      })

      await expect(
        service.getForecast('workspace-1', 'account-1', {
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        })
      ).rejects.toThrow('Forecast calculation failed: Network error')
    })

    it('should handle unknown errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw 'String error' // Non-Error object
      })

      await expect(
        service.getForecast('workspace-1', 'account-1', {
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        })
      ).rejects.toThrow('Forecast calculation failed: Unknown error')
    })
  })
})
