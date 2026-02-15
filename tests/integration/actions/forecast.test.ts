/**
 * Integration tests for forecast server actions
 * 
 * Tests the complete forecast flow including:
 * - Authentication and authorization
 * - Data fetching
 * - Forecast calculation
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getForecast, invalidateForecastCache, invalidateWorkspaceForecastCache } from '@/actions/forecast'
import { createClient } from '@/lib/supabase/server'
import { forecastService } from '@/lib/services/forecast-service'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock forecast service
vi.mock('@/lib/services/forecast-service', () => ({
  forecastService: {
    getForecast: vi.fn(),
    invalidateCache: vi.fn(),
    invalidateWorkspaceCache: vi.fn(),
  },
}))

describe('getForecast', () => {
  const mockWorkspaceId = 'workspace-123'
  const mockAccountId = 'account-456'
  const mockUserId = 'user-789'
  const mockMonth = new Date('2026-02-01')

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  describe('Authentication and Authorization', () => {
    it('should return error if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBe('Unauthorized - please log in')
      expect(result.data).toBeUndefined()
    })

    it('should return error if user is not a workspace member', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      })

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBe('Access denied - you do not have access to this workspace')
      expect(result.data).toBeUndefined()
    })

    it('should return error if account does not belong to workspace', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock workspace membership check (success)
      const mockWorkspaceMemberQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'member-1', role: 'owner' },
                error: null,
              }),
            }),
          }),
        }),
      }

      // Mock account check (failure)
      const mockAccountQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Not found'),
                }),
              }),
            }),
          }),
        }),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') return mockWorkspaceMemberQuery
        if (table === 'accounts') return mockAccountQuery
        return {}
      })

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBe('Account not found or does not belong to this workspace')
      expect(result.data).toBeUndefined()
    })
  })

  describe('Successful Forecast Calculation', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      // Mock successful workspace membership
      const mockWorkspaceMemberQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'member-1', role: 'owner' },
                error: null,
              }),
            }),
          }),
        }),
      }

      // Mock successful account check
      const mockAccountQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockAccountId, workspace_id: mockWorkspaceId },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') return mockWorkspaceMemberQuery
        if (table === 'accounts') return mockAccountQuery
        return {}
      })
    })

    it('should return forecast data when all checks pass', async () => {
      const mockForecastData = {
        forecast: {
          forecasts: [
            {
              date: '2026-02-01',
              projectedBalance: 5000,
              confidence: 'high' as const,
              riskLevel: 'safe' as const,
              breakdown: {
                startingBalance: 5000,
                plannedIncome: 0,
                plannedExpenses: 0,
                estimatedDailySpending: 100,
                endingBalance: 4900,
              },
            },
          ],
          averageDailySpending: 100,
          spendingConfidence: 'high' as const,
          shouldDisplay: true,
        },
        paymentRisks: [],
        currentBalance: 5000,
        userSettings: {
          minimumSafeBalance: 1000,
          safetyBufferDays: 7,
        },
      }

      vi.mocked(forecastService.getForecast).mockResolvedValue(mockForecastData)

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data?.dailyForecasts).toHaveLength(1)
      expect(result.data?.averageDailySpending).toBe(100)
      expect(result.data?.spendingConfidence).toBe('high')
      expect(result.data?.currentBalance).toBe(5000)
      expect(result.data?.metadata.shouldDisplay).toBe(true)
    })

    it('should call forecastService with correct parameters', async () => {
      const mockForecastData = {
        forecast: {
          forecasts: [],
          averageDailySpending: 0,
          spendingConfidence: 'none' as const,
          shouldDisplay: false,
        },
        paymentRisks: [],
        currentBalance: 0,
        userSettings: {
          minimumSafeBalance: 1000,
          safetyBufferDays: 7,
        },
      }

      vi.mocked(forecastService.getForecast).mockResolvedValue(mockForecastData)

      await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      // Verify the call was made with correct workspace and account
      expect(forecastService.getForecast).toHaveBeenCalledWith(
        mockWorkspaceId,
        mockAccountId,
        expect.objectContaining({
          startDate: expect.stringMatching(/^2026-02-01$/),
          endDate: expect.stringMatching(/^2026-02-2[89]$/), // 28 or 29 depending on timezone
        })
      )
    })

    it('should handle leap year correctly', async () => {
      const leapYearMonth = new Date('2024-02-01')

      const mockForecastData = {
        forecast: {
          forecasts: [],
          averageDailySpending: 0,
          spendingConfidence: 'none' as const,
          shouldDisplay: false,
        },
        paymentRisks: [],
        currentBalance: 0,
        userSettings: {
          minimumSafeBalance: 1000,
          safetyBufferDays: 7,
        },
      }

      vi.mocked(forecastService.getForecast).mockResolvedValue(mockForecastData)

      await getForecast(mockWorkspaceId, mockAccountId, leapYearMonth)

      expect(forecastService.getForecast).toHaveBeenCalledWith(
        mockWorkspaceId,
        mockAccountId,
        {
          startDate: '2024-02-01',
          endDate: '2024-02-29', // Leap year has 29 days
        }
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock successful authentication and authorization
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null,
      })

      const mockWorkspaceMemberQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'member-1', role: 'owner' },
                error: null,
              }),
            }),
          }),
        }),
      }

      const mockAccountQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockAccountId, workspace_id: mockWorkspaceId },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'workspace_members') return mockWorkspaceMemberQuery
        if (table === 'accounts') return mockAccountQuery
        return {}
      })
    })

    it('should handle forecast service errors gracefully', async () => {
      vi.mocked(forecastService.getForecast).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBe('Failed to calculate forecast: Database connection failed')
      expect(result.data).toBeUndefined()
    })

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(forecastService.getForecast).mockRejectedValue('Unknown error')

      const result = await getForecast(mockWorkspaceId, mockAccountId, mockMonth)

      expect(result.error).toBe('An unexpected error occurred while calculating forecast')
      expect(result.data).toBeUndefined()
    })
  })
})

describe('invalidateForecastCache', () => {
  const mockWorkspaceId = 'workspace-123'
  const mockAccountId = 'account-456'
  const mockUserId = 'user-789'

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  it('should invalidate cache when authorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-1' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const result = await invalidateForecastCache(mockWorkspaceId, mockAccountId)

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ success: true })
    expect(forecastService.invalidateCache).toHaveBeenCalledWith(
      mockWorkspaceId,
      mockAccountId
    )
  })

  it('should return error if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const result = await invalidateForecastCache(mockWorkspaceId, mockAccountId)

    expect(result.error).toBe('Unauthorized')
    expect(result.data).toBeUndefined()
    expect(forecastService.invalidateCache).not.toHaveBeenCalled()
  })

  it('should return error if not workspace member', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      }),
    })

    const result = await invalidateForecastCache(mockWorkspaceId, mockAccountId)

    expect(result.error).toBe('Access denied')
    expect(result.data).toBeUndefined()
    expect(forecastService.invalidateCache).not.toHaveBeenCalled()
  })
})

describe('invalidateWorkspaceForecastCache', () => {
  const mockWorkspaceId = 'workspace-123'
  const mockUserId = 'user-789'

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  it('should invalidate workspace cache when authorized', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'member-1' },
              error: null,
            }),
          }),
        }),
      }),
    })

    const result = await invalidateWorkspaceForecastCache(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({ success: true })
    expect(forecastService.invalidateWorkspaceCache).toHaveBeenCalledWith(mockWorkspaceId)
  })

  it('should return error if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const result = await invalidateWorkspaceForecastCache(mockWorkspaceId)

    expect(result.error).toBe('Unauthorized')
    expect(result.data).toBeUndefined()
    expect(forecastService.invalidateWorkspaceCache).not.toHaveBeenCalled()
  })
})
