/**
 * Tests for Balance Reconciliation Server Actions
 * 
 * Tests the getAccountDifference server action implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { Account } from './accounts'
import type { Transaction } from '@/types'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

// Mock middleware
vi.mock('@/lib/middleware', () => ({
  getUserWorkspaceContext: vi.fn()
}))

// Mock balance calculator
vi.mock('@/lib/utils/balance-calculator', () => ({
  calculateAccountBalance: vi.fn(),
  calculateDifference: vi.fn()
}))

// Mock currency converter
vi.mock('@/lib/utils/currency-converter', () => ({
  calculateTotalDifference: vi.fn()
}))

// Helper function to create mock accounts with all required fields
function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    workspace_id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Account',
    type: 'checking',
    opening_balance: 1000,
    current_balance: 1200,
    current_balance_updated_at: new Date().toISOString(),
    currency: 'UAH',
    initial_balance: 1000,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}


describe('getAccountDifference', () => {
  const mockAccountId = '123e4567-e89b-12d3-a456-426614174000'
  const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174001'
  const mockUserId = '123e4567-e89b-12d3-a456-426614174002'
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn()
    }
    
    // Mock the createClient function
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if user is not authenticated', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
    } as any)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBe('Authentication required')
    expect(result.data).toBeUndefined()
  })

  it('should return error if accountId is invalid', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const result = await getAccountDifference('')

    expect(result.error).toBe('Invalid account ID')
    expect(result.data).toBeUndefined()
  })

  it('should return error if account is not found', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })
    } as any)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBe('Account not found')
    expect(result.data).toBeUndefined()
  })

  it('should return error if user does not have access to workspace', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const mockAccount = createMockAccount({
      id: mockAccountId,
      workspace_id: mockWorkspaceId
    })

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockAccount, transactions: [], workspace: { id: mockWorkspaceId, owner_id: mockUserId } },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: false,
      error: 'No workspace found'
    } as any)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBe('No workspace found')
    expect(result.data).toBeUndefined()
  })

  it('should return error if account does not belong to user workspace', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const differentWorkspaceId = '123e4567-e89b-12d3-a456-426614174099'
    const mockAccount = createMockAccount({
      id: mockAccountId,
      workspace_id: differentWorkspaceId
    })

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockAccount, transactions: [], workspace: { id: differentWorkspaceId, owner_id: mockUserId } },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBe('Access denied to this account')
    expect(result.data).toBeUndefined()
  })

  it('should calculate and return account balance with difference', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        workspace_id: mockWorkspaceId,
        account_id: mockAccountId,
        amount: 500,
        type: 'income',
        description: 'Salary',
        transaction_date: new Date().toISOString(),
        currency: 'UAH',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        category_id: null,
        created_by: mockUserId,
        expected_transaction_id: null,
        is_expected: false,
        notes: null,
        locked: false,
        original_amount: 500,
        original_currency: 'UAH',
        recurring_transaction_id: null,
        transaction_type_id: null,
        updated_by: null,
        user_id: mockUserId
      },
      {
        id: '2',
        workspace_id: mockWorkspaceId,
        account_id: mockAccountId,
        amount: 200,
        type: 'expense',
        description: 'Groceries',
        transaction_date: new Date().toISOString(),
        currency: 'UAH',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        category_id: null,
        created_by: mockUserId,
        expected_transaction_id: null,
        is_expected: false,
        notes: null,
        locked: false,
        original_amount: 200,
        original_currency: 'UAH',
        recurring_transaction_id: null,
        transaction_type_id: null,
        updated_by: null,
        user_id: mockUserId
      }
    ]

    const mockAccount = createMockAccount({
      id: mockAccountId,
      workspace_id: mockWorkspaceId,
      opening_balance: 1000,
      current_balance: 1200
    })

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockAccount, transactions: mockTransactions, workspace: { id: mockWorkspaceId, owner_id: mockUserId } },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    // Mock balance calculations
    const calculatedBalance = 1300 // 1000 + 500 - 200
    const difference = -100 // 1200 - 1300
    
    vi.mocked(calculateAccountBalance).mockReturnValue(calculatedBalance)
    vi.mocked(calculateDifference).mockReturnValue(difference)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.account_id).toBe(mockAccountId)
    expect(result.data?.opening_balance).toBe(1000)
    expect(result.data?.current_balance).toBe(1200)
    expect(result.data?.calculated_balance).toBe(1300)
    expect(result.data?.difference).toBe(-100)
    expect(result.data?.currency).toBe('UAH')
    expect(result.data?.is_reconciled).toBe(false)
    
    // Verify balance calculator was called correctly
    expect(calculateAccountBalance).toHaveBeenCalledWith(1000, mockTransactions)
    expect(calculateDifference).toHaveBeenCalledWith(1200, 1300)
  })

  it('should mark account as reconciled when difference is less than 0.01', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const mockAccount = createMockAccount({
      id: mockAccountId,
      workspace_id: mockWorkspaceId,
      opening_balance: 1000,
      current_balance: 1300
    })

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockAccount, transactions: [], workspace: { id: mockWorkspaceId, owner_id: mockUserId } },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    // Mock balance calculations - difference is 0
    const calculatedBalance = 1300
    const difference = 0
    
    vi.mocked(calculateAccountBalance).mockReturnValue(calculatedBalance)
    vi.mocked(calculateDifference).mockReturnValue(difference)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.difference).toBe(0)
    expect(result.data?.is_reconciled).toBe(true)
  })

  it('should handle accounts with no transactions', async () => {
    const { getAccountDifference } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const mockAccount = createMockAccount({
      id: mockAccountId,
      workspace_id: mockWorkspaceId,
      opening_balance: 1000,
      current_balance: 1000
    })

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockAccount, transactions: [], workspace: { id: mockWorkspaceId, owner_id: mockUserId } },
            error: null
          })
        })
      })
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    // Mock balance calculations - no transactions, so calculated = opening
    const calculatedBalance = 1000
    const difference = 0
    
    vi.mocked(calculateAccountBalance).mockReturnValue(calculatedBalance)
    vi.mocked(calculateDifference).mockReturnValue(difference)

    const result = await getAccountDifference(mockAccountId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.calculated_balance).toBe(1000)
    expect(result.data?.difference).toBe(0)
    expect(result.data?.is_reconciled).toBe(true)
    
    // Verify empty array was passed to calculator
    expect(calculateAccountBalance).toHaveBeenCalledWith(1000, [])
  })
})


describe('getReconciliationStatus', () => {
  const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174001'
  const mockUserId = '123e4567-e89b-12d3-a456-426614174002'

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if user is not authenticated', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
    } as any)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBe('Authentication required')
    expect(result.data).toBeUndefined()
  })

  it('should return error if workspaceId is invalid', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const result = await getReconciliationStatus('')

    expect(result.error).toBe('Invalid workspace ID')
    expect(result.data).toBeUndefined()
  })

  it('should return error if user does not have access to workspace', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: false,
      error: 'No workspace found'
    } as any)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBe('No workspace found')
    expect(result.data).toBeUndefined()
  })

  it('should return error if requested workspace does not match user workspace', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const differentWorkspaceId = '123e4567-e89b-12d3-a456-426614174099'
    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: differentWorkspaceId
    } as any)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBe('Access denied to this workspace')
    expect(result.data).toBeUndefined()
  })

  it('should return error if accounts fetch fails', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
    } as any)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBe('Failed to fetch accounts')
    expect(result.data).toBeUndefined()
  })

  it('should calculate reconciliation status for single account', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockAccounts = [
      {
        id: 'account-1',
        workspace_id: mockWorkspaceId,
        name: 'Checking',
        type: 'checking',
        opening_balance: 1000,
        current_balance: 1200,
        current_balance_updated_at: '2024-01-15T10:00:00Z',
        currency: 'UAH',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        transactions: []
      }
    ]

    const mockWorkspace = {
      id: mockWorkspaceId,
      currency: 'UAH'
    }

    // Mock database calls
    let callCount = 0
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAccounts,
                error: null
              })
            })
          })
        } as any
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockWorkspace,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    // Mock balance calculations
    vi.mocked(calculateAccountBalance).mockReturnValue(1100)
    vi.mocked(calculateDifference).mockReturnValue(100)
    vi.mocked(calculateTotalDifference).mockResolvedValue(100)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.total_difference).toBe(100)
    expect(result.data?.total_difference_currency).toBe('UAH')
    expect(result.data?.accounts).toHaveLength(1)
    expect(result.data?.accounts[0].account_id).toBe('account-1')
    expect(result.data?.accounts[0].difference).toBe(100)
    expect(result.data?.accounts[0].is_reconciled).toBe(false)
    expect(result.data?.all_reconciled).toBe(false)
    expect(result.data?.last_update).toBe('2024-01-15T10:00:00Z')
  })

  it('should calculate reconciliation status for multiple accounts', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockAccounts = [
      {
        id: 'account-1',
        workspace_id: mockWorkspaceId,
        name: 'Checking',
        type: 'checking',
        opening_balance: 1000,
        current_balance: 1200,
        current_balance_updated_at: '2024-01-15T10:00:00Z',
        currency: 'UAH',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        transactions: []
      },
      {
        id: 'account-2',
        workspace_id: mockWorkspaceId,
        name: 'Savings',
        type: 'savings',
        opening_balance: 5000,
        current_balance: 4800,
        current_balance_updated_at: '2024-01-16T14:30:00Z',
        currency: 'USD',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-16T14:30:00Z',
        transactions: []
      }
    ]

    const mockWorkspace = {
      id: mockWorkspaceId,
      currency: 'UAH'
    }

    // Mock database calls
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAccounts,
                error: null
              })
            })
          })
        } as any
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockWorkspace,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    // Mock balance calculations
    vi.mocked(calculateAccountBalance)
      .mockReturnValueOnce(1100) // First account
      .mockReturnValueOnce(5000) // Second account
    
    vi.mocked(calculateDifference)
      .mockReturnValueOnce(100)  // First account: 1200 - 1100
      .mockReturnValueOnce(-200) // Second account: 4800 - 5000
    
    vi.mocked(calculateTotalDifference).mockResolvedValue(50) // After currency conversion

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.total_difference).toBe(50)
    expect(result.data?.total_difference_currency).toBe('UAH')
    expect(result.data?.accounts).toHaveLength(2)
    expect(result.data?.accounts[0].difference).toBe(100)
    expect(result.data?.accounts[1].difference).toBe(-200)
    expect(result.data?.all_reconciled).toBe(false)
    expect(result.data?.last_update).toBe('2024-01-16T14:30:00Z') // Most recent
  })

  it('should mark all_reconciled as true when all accounts are reconciled', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockAccounts = [
      {
        id: 'account-1',
        workspace_id: mockWorkspaceId,
        name: 'Checking',
        type: 'checking',
        opening_balance: 1000,
        current_balance: 1000,
        current_balance_updated_at: '2024-01-15T10:00:00Z',
        currency: 'UAH',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        transactions: []
      }
    ]

    const mockWorkspace = {
      id: mockWorkspaceId,
      currency: 'UAH'
    }

    // Mock database calls
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAccounts,
                error: null
              })
            })
          })
        } as any
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockWorkspace,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    // Mock balance calculations - all reconciled
    vi.mocked(calculateAccountBalance).mockReturnValue(1000)
    vi.mocked(calculateDifference).mockReturnValue(0)
    vi.mocked(calculateTotalDifference).mockResolvedValue(0)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.total_difference).toBe(0)
    expect(result.data?.accounts[0].is_reconciled).toBe(true)
    expect(result.data?.all_reconciled).toBe(true)
  })

  it('should handle workspace with no accounts', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockWorkspace = {
      id: mockWorkspaceId,
      currency: 'UAH'
    }

    // Mock database calls
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockWorkspace,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    vi.mocked(calculateTotalDifference).mockResolvedValue(0)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.total_difference).toBe(0)
    expect(result.data?.accounts).toHaveLength(0)
    expect(result.data?.all_reconciled).toBe(true) // No accounts = all reconciled
    expect(result.data?.last_update).toBeNull()
  })

  it('should use UAH as default currency if workspace currency not found', async () => {
    const { getReconciliationStatus } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const { calculateAccountBalance, calculateDifference } = await import('@/lib/utils/balance-calculator')
    const { calculateTotalDifference } = await import('@/lib/utils/currency-converter')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockAccounts = [
      {
        id: 'account-1',
        workspace_id: mockWorkspaceId,
        name: 'Checking',
        type: 'checking',
        opening_balance: 1000,
        current_balance: 1000,
        current_balance_updated_at: null,
        currency: 'UAH',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        transactions: []
      }
    ]

    // Mock database calls
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockAccounts,
                error: null
              })
            })
          })
        } as any
      } else if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null, // Workspace not found
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    vi.mocked(calculateAccountBalance).mockReturnValue(1000)
    vi.mocked(calculateDifference).mockReturnValue(0)
    vi.mocked(calculateTotalDifference).mockResolvedValue(0)

    const result = await getReconciliationStatus(mockWorkspaceId)

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data?.total_difference_currency).toBe('UAH') // Default fallback
  })
})


describe('getBalanceUpdateHistory', () => {
  const mockAccountId = '123e4567-e89b-12d3-a456-426614174000'
  const mockWorkspaceId = '123e4567-e89b-12d3-a456-426614174001'
  const mockUserId = '123e4567-e89b-12d3-a456-426614174002'

  beforeEach(async () => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if user is not authenticated', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated', name: 'AuthError', status: 401 }
    } as any)

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBe('Authentication required')
    expect(result.data).toBeUndefined()
  })

  it('should return error if neither accountId nor workspaceId is provided', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    const result = await getBalanceUpdateHistory({})

    expect(result.error).toBe('Either accountId or workspaceId is required')
    expect(result.data).toBeUndefined()
  })

  it('should return error if account is not found', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBe('Account not found')
    expect(result.data).toBeUndefined()
  })

  it('should return error if account does not belong to user workspace', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const differentWorkspaceId = '123e4567-e89b-12d3-a456-426614174099'
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: differentWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBe('Access denied to this account')
    expect(result.data).toBeUndefined()
  })

  it('should return error if workspace does not match user workspace', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const differentWorkspaceId = '123e4567-e89b-12d3-a456-426614174099'
    const result = await getBalanceUpdateHistory({ workspaceId: differentWorkspaceId })

    expect(result.error).toBe('Access denied to this workspace')
    expect(result.data).toBeUndefined()
  })

  it('should fetch history for a specific account', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'history-2',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 800,
        new_balance: 1000,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-10T10:00:00Z'
      }
    ]

    // Mock database calls
    let callCount = 0
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].id).toBe('history-1')
    expect(result.data?.[0].old_balance).toBe(1000)
    expect(result.data?.[0].new_balance).toBe(1200)
    expect(result.data?.[0].difference).toBe(200)
  })

  it('should calculate duration between updates (Requirement 10.4)', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z' // Most recent
      },
      {
        id: 'history-2',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 800,
        new_balance: 1000,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-10T10:00:00Z' // 5 days earlier
      }
    ]

    // Mock database calls
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(2)
    
    // First entry should have duration since last update
    expect(result.data?.[0].duration_since_last_update).toBeDefined()
    const expectedDuration = new Date('2024-01-15T10:00:00Z').getTime() - new Date('2024-01-10T10:00:00Z').getTime()
    expect(result.data?.[0].duration_since_last_update).toBe(expectedDuration)
    
    // Last entry should not have duration (it's the oldest)
    expect(result.data?.[1].duration_since_last_update).toBeUndefined()
  })

  it('should fetch history for entire workspace', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: 'account-1',
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'history-2',
        account_id: 'account-2',
        workspace_id: mockWorkspaceId,
        old_balance: 5000,
        new_balance: 4800,
        difference: -200,
        updated_by: mockUserId,
        updated_at: '2024-01-14T10:00:00Z'
      }
    ]

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null
          })
        })
      })
    } as any)

    const result = await getBalanceUpdateHistory({ workspaceId: mockWorkspaceId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].account_id).toBe('account-1')
    expect(result.data?.[1].account_id).toBe('account-2')
  })

  it('should filter history by date range (Requirement 10.5)', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    let capturedQuery: any = null
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        const query = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null
          })
        }
        capturedQuery = query
        return query as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({
      accountId: mockAccountId,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z'
    })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    
    // Verify date filters were applied
    expect(capturedQuery.gte).toHaveBeenCalledWith('updated_at', '2024-01-01T00:00:00Z')
    expect(capturedQuery.lte).toHaveBeenCalledWith('updated_at', '2024-01-31T23:59:59Z')
  })

  it('should return empty array when no history exists', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(0)
  })

  it('should return error if history fetch fails', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBe('Failed to fetch balance update history')
    expect(result.data).toBeUndefined()
  })

  it('should handle multiple updates with correct duration calculations', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    // Three updates with specific time intervals
    const mockHistory = [
      {
        id: 'history-3',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1200,
        new_balance: 1500,
        difference: 300,
        updated_by: mockUserId,
        updated_at: '2024-01-20T15:30:00Z' // Most recent
      },
      {
        id: 'history-2',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z' // 5 days, 5.5 hours earlier
      },
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 800,
        new_balance: 1000,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-10T08:00:00Z' // 5 days, 2 hours earlier
      }
    ]

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(3)
    
    // First entry (most recent) should have duration since second entry
    const duration1 = new Date('2024-01-20T15:30:00Z').getTime() - new Date('2024-01-15T10:00:00Z').getTime()
    expect(result.data?.[0].duration_since_last_update).toBe(duration1)
    
    // Second entry should have duration since third entry
    const duration2 = new Date('2024-01-15T10:00:00Z').getTime() - new Date('2024-01-10T08:00:00Z').getTime()
    expect(result.data?.[1].duration_since_last_update).toBe(duration2)
    
    // Last entry (oldest) should not have duration
    expect(result.data?.[2].duration_since_last_update).toBeUndefined()
  })

  it('should filter by startDate only', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    let capturedQuery: any = null
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        const query = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null
          })
        }
        capturedQuery = query
        return query as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({
      accountId: mockAccountId,
      startDate: '2024-01-01T00:00:00Z'
    })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    
    // Verify only startDate filter was applied
    expect(capturedQuery.gte).toHaveBeenCalledWith('updated_at', '2024-01-01T00:00:00Z')
  })

  it('should filter by endDate only', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    let capturedQuery: any = null
    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        const query = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null
          })
        }
        capturedQuery = query
        return query as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({
      accountId: mockAccountId,
      endDate: '2024-01-31T23:59:59Z'
    })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    
    // Verify only endDate filter was applied
    expect(capturedQuery.lte).toHaveBeenCalledWith('updated_at', '2024-01-31T23:59:59Z')
  })

  it('should handle history with negative balance changes', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1200,
        new_balance: 800,
        difference: -400,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].old_balance).toBe(1200)
    expect(result.data?.[0].new_balance).toBe(800)
    expect(result.data?.[0].difference).toBe(-400)
  })

  it('should handle history with zero balance changes', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-1',
        account_id: mockAccountId,
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1000,
        difference: 0,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      }
    ]

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: mockAccountId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].old_balance).toBe(1000)
    expect(result.data?.[0].new_balance).toBe(1000)
    expect(result.data?.[0].difference).toBe(0)
  })

  it('should handle workspace history with multiple accounts', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-3',
        account_id: 'account-1',
        workspace_id: mockWorkspaceId,
        old_balance: 1000,
        new_balance: 1200,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'history-2',
        account_id: 'account-2',
        workspace_id: mockWorkspaceId,
        old_balance: 5000,
        new_balance: 4800,
        difference: -200,
        updated_by: mockUserId,
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: 'history-1',
        account_id: 'account-1',
        workspace_id: mockWorkspaceId,
        old_balance: 800,
        new_balance: 1000,
        difference: 200,
        updated_by: mockUserId,
        updated_at: '2024-01-14T10:00:00Z'
      }
    ]

    vi.mocked(mockSupabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockHistory,
            error: null
          })
        })
      })
    } as any)

    const result = await getBalanceUpdateHistory({ workspaceId: mockWorkspaceId })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(3)
    
    // Verify history includes multiple accounts
    const accountIds = new Set(result.data?.map(h => h.account_id))
    expect(accountIds.size).toBe(2)
    expect(accountIds.has('account-1')).toBe(true)
    expect(accountIds.has('account-2')).toBe(true)
    
    // Verify duration calculations work across different accounts
    // First entry should have duration since second entry (different account)
    const duration1 = new Date('2024-01-16T10:00:00Z').getTime() - new Date('2024-01-15T10:00:00Z').getTime()
    expect(result.data?.[0].duration_since_last_update).toBe(duration1)
    
    // Second entry should have duration since third entry (different account)
    const duration2 = new Date('2024-01-15T10:00:00Z').getTime() - new Date('2024-01-14T10:00:00Z').getTime()
    expect(result.data?.[1].duration_since_last_update).toBe(duration2)
  })

  it('should preserve all history fields in response', async () => {
    const { getBalanceUpdateHistory } = await import('./balance-reconciliation')
    const { createClient } = await import('@/lib/supabase/server')
    const { getUserWorkspaceContext } = await import('@/lib/middleware')
    const mockSupabase = await createClient()
    
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null
    } as any)

    vi.mocked(getUserWorkspaceContext).mockResolvedValue({
      authorized: true,
      workspaceId: mockWorkspaceId
    } as any)

    const mockHistory = [
      {
        id: 'history-123',
        account_id: 'account-456',
        workspace_id: 'workspace-789',
        old_balance: 1234.56,
        new_balance: 5678.90,
        difference: 4444.34,
        updated_by: 'user-abc',
        updated_at: '2024-01-15T10:30:45Z'
      }
    ]

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { workspace_id: mockWorkspaceId },
                error: null
              })
            })
          })
        } as any
      } else if (table === 'balance_update_history') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        } as any
      }
      return {} as any
    })

    const result = await getBalanceUpdateHistory({ accountId: 'account-456' })

    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()
    expect(result.data).toHaveLength(1)
    
    // Verify all fields are preserved
    const entry = result.data?.[0]
    expect(entry?.id).toBe('history-123')
    expect(entry?.account_id).toBe('account-456')
    expect(entry?.workspace_id).toBe('workspace-789')
    expect(entry?.old_balance).toBe(1234.56)
    expect(entry?.new_balance).toBe(5678.90)
    expect(entry?.difference).toBe(4444.34)
    expect(entry?.updated_by).toBe('user-abc')
    expect(entry?.updated_at).toBe('2024-01-15T10:30:45Z')
  })
})
