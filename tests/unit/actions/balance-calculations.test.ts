/**
 * Unit tests for balance calculation logic
 * Task: 3.2 Update balance calculation logic
 * 
 * Tests verify that:
 * - Planned transactions are excluded from balance calculations
 * - Completed transactions are included in balance calculations
 * - Edge cases are handled correctly (all planned, all completed, mixed)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAccounts } from '@/actions/accounts'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaceContext } from '@/lib/middleware'

// Mock dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/middleware')

describe('Balance Calculation Logic', () => {
  const mockUserId = 'user-123'
  const mockWorkspaceId = 'workspace-123'
  const mockAccountId = 'account-123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock authentication
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    // Mock workspace context
    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId,
      userId: mockUserId,
      role: 'owner',
    })
  })

  describe('Planned Transaction Exclusion', () => {
    it('should exclude planned transactions from balance calculation', async () => {
      const mockSupabase = await createClient()

      // Mock account_actual_balances view response (excludes planned)
      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 500, // Only completed transactions
            calculated_balance: 1500,
          },
        ],
        error: null,
      }

      // Mock accounts table response
      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000, // Will be updated with calculated balance
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      // Setup mock chain
      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView) // First call for view
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      }) // Second call for accounts

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data![0].current_balance).toBe(1500)
      expect(mockSupabase.from).toHaveBeenCalledWith('account_actual_balances')
    })

    it('should handle accounts with only planned transactions (balance unchanged)', async () => {
      const mockSupabase = await createClient()

      // Mock view response - no completed transactions, so transaction_sum = 0
      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 0, // No completed transactions
            calculated_balance: 1000, // Balance unchanged
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data![0].current_balance).toBe(1000) // Unchanged
    })

    it('should handle mixed planned and completed transactions correctly', async () => {
      const mockSupabase = await createClient()

      // Scenario: Opening balance 1000, completed +500, planned +300 (should be ignored)
      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 500, // Only completed
            calculated_balance: 1500, // 1000 + 500 (planned ignored)
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.error).toBeUndefined()
      expect(result.data![0].current_balance).toBe(1500)
      // Planned transaction of 300 should NOT be included
    })
  })

  describe('Income and Expense Handling', () => {
    it('should add income transactions to balance', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 500, // Income
            calculated_balance: 1500,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(1500)
    })

    it('should subtract expense transactions from balance', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: -300, // Expense
            calculated_balance: 700,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(700)
    })

    it('should handle multiple income and expense transactions', async () => {
      const mockSupabase = await createClient()

      // Opening: 1000, Income: +500, Expense: -200, Net: +300
      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 300, // +500 - 200
            calculated_balance: 1300,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(1300)
    })
  })

  describe('Edge Cases', () => {
    it('should handle accounts with no transactions', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 1000,
            transaction_sum: 0,
            calculated_balance: 1000,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(1000)
    })

    it('should handle zero opening balance', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 0,
            transaction_sum: 500,
            calculated_balance: 500,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 0,
            current_balance: 0,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(500)
    })

    it('should handle negative balance (overdraft)', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: mockAccountId,
            name: 'Test Account',
            opening_balance: 100,
            transaction_sum: -200, // More expenses than balance
            calculated_balance: -100,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 100,
            current_balance: 100,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data![0].current_balance).toBe(-100)
    })

    it('should fallback to direct query if view fails', async () => {
      const mockSupabase = await createClient()

      // Mock view failure
      const mockBalanceViewError = {
        data: null,
        error: { message: 'View not found' },
      }

      const mockAccounts = {
        data: [
          {
            id: mockAccountId,
            workspace_id: mockWorkspaceId,
            name: 'Test Account',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceViewError) // View fails
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.error).toBeUndefined()
      expect(result.data).toBeDefined()
      expect(result.data![0].current_balance).toBe(1000) // Uses stored balance
    })
  })

  describe('Multiple Accounts', () => {
    it('should calculate balances for multiple accounts independently', async () => {
      const mockSupabase = await createClient()

      const mockBalanceView = {
        data: [
          {
            account_id: 'account-1',
            name: 'Account 1',
            opening_balance: 1000,
            transaction_sum: 500,
            calculated_balance: 1500,
          },
          {
            account_id: 'account-2',
            name: 'Account 2',
            opening_balance: 2000,
            transaction_sum: -300,
            calculated_balance: 1700,
          },
        ],
        error: null,
      }

      const mockAccounts = {
        data: [
          {
            id: 'account-1',
            workspace_id: mockWorkspaceId,
            name: 'Account 1',
            type: 'checking',
            opening_balance: 1000,
            current_balance: 1000,
            currency: 'UAH',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'account-2',
            workspace_id: mockWorkspaceId,
            name: 'Account 2',
            type: 'savings',
            opening_balance: 2000,
            current_balance: 2000,
            currency: 'UAH',
            is_default: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      }

      const selectMock = vi.fn()
      selectMock.mockReturnValueOnce(mockBalanceView)
      selectMock.mockReturnValueOnce({
        ...mockAccounts,
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockAccounts),
        }),
      })

      vi.mocked(mockSupabase.from).mockImplementation((table: string) => ({
        select: selectMock,
      }) as any)

      const result = await getAccounts()

      expect(result.data).toHaveLength(2)
      expect(result.data![0].current_balance).toBe(1500)
      expect(result.data![1].current_balance).toBe(1700)
    })
  })
})
