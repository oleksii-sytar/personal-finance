/**
 * Unit tests for account utility functions
 * Following testing.md standards
 */

import { describe, it, expect } from 'vitest'
import type { Account } from '@/types'
import {
  calculateTotalBalance,
  countAccountsByType,
  getDebtAccounts,
  generateAccountSummary,
  formatAccountTypeCounts,
  findDefaultAccount,
  isDebtAccount,
  formatAccountBalance,
  sortAccountsByDate,
} from '../accounts'

// Mock account factory
function createMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'test-id',
    workspace_id: 'workspace-id',
    name: 'Test Account',
    type: 'checking',
    opening_balance: 1000,
    current_balance: 1000,
    current_balance_updated_at: null,
    currency: 'UAH',
    is_default: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calculateTotalBalance', () => {
  it('calculates total balance across multiple accounts', () => {
    const accounts = [
      createMockAccount({ current_balance: 1000 }),
      createMockAccount({ current_balance: 500 }),
      createMockAccount({ current_balance: 250 }),
    ]

    expect(calculateTotalBalance(accounts)).toBe(1750)
  })

  it('handles negative balances correctly', () => {
    const accounts = [
      createMockAccount({ current_balance: 1000 }),
      createMockAccount({ current_balance: -500 }),
    ]

    expect(calculateTotalBalance(accounts)).toBe(500)
  })

  it('returns 0 for empty array', () => {
    expect(calculateTotalBalance([])).toBe(0)
  })
})

describe('countAccountsByType', () => {
  it('counts accounts by type correctly', () => {
    const accounts = [
      createMockAccount({ type: 'checking' }),
      createMockAccount({ type: 'checking' }),
      createMockAccount({ type: 'savings' }),
      createMockAccount({ type: 'credit' }),
    ]

    const counts = countAccountsByType(accounts)

    expect(counts).toEqual({
      checking: 2,
      savings: 1,
      credit: 1,
      investment: 0,
    })
  })

  it('returns zero counts for empty array', () => {
    const counts = countAccountsByType([])

    expect(counts).toEqual({
      checking: 0,
      savings: 0,
      credit: 0,
      investment: 0,
    })
  })
})

describe('getDebtAccounts', () => {
  it('identifies accounts with negative balances', () => {
    const accounts = [
      createMockAccount({ id: '1', current_balance: 1000 }),
      createMockAccount({ id: '2', current_balance: -500 }),
      createMockAccount({ id: '3', current_balance: -100 }),
    ]

    const debtAccounts = getDebtAccounts(accounts)

    expect(debtAccounts).toHaveLength(2)
    expect(debtAccounts[0].id).toBe('2')
    expect(debtAccounts[1].id).toBe('3')
  })

  it('returns empty array when no debt accounts', () => {
    const accounts = [
      createMockAccount({ current_balance: 1000 }),
      createMockAccount({ current_balance: 500 }),
    ]

    expect(getDebtAccounts(accounts)).toEqual([])
  })
})

describe('generateAccountSummary', () => {
  it('generates complete account summary', () => {
    const accounts = [
      createMockAccount({ type: 'checking', current_balance: 1000 }),
      createMockAccount({ type: 'savings', current_balance: 500 }),
      createMockAccount({ type: 'credit', current_balance: -200 }),
    ]

    const summary = generateAccountSummary(accounts)

    expect(summary.total_balance).toBe(1300)
    expect(summary.total_accounts).toBe(3)
    expect(summary.account_counts.checking).toBe(1)
    expect(summary.account_counts.savings).toBe(1)
    expect(summary.account_counts.credit).toBe(1)
    expect(summary.debt_accounts).toHaveLength(1)
  })
})

describe('formatAccountTypeCounts', () => {
  it('formats account type counts as readable string', () => {
    const counts = {
      checking: 2,
      savings: 1,
      credit: 0,
      investment: 0,
    }

    expect(formatAccountTypeCounts(counts)).toBe('2 Checking, 1 Savings')
  })

  it('returns "No accounts" for zero counts', () => {
    const counts = {
      checking: 0,
      savings: 0,
      credit: 0,
      investment: 0,
    }

    expect(formatAccountTypeCounts(counts)).toBe('No accounts')
  })
})

describe('findDefaultAccount', () => {
  it('finds the default account', () => {
    const accounts = [
      createMockAccount({ id: '1', is_default: false }),
      createMockAccount({ id: '2', is_default: true }),
      createMockAccount({ id: '3', is_default: false }),
    ]

    const defaultAccount = findDefaultAccount(accounts)

    expect(defaultAccount?.id).toBe('2')
  })

  it('returns undefined when no default account', () => {
    const accounts = [
      createMockAccount({ is_default: false }),
      createMockAccount({ is_default: false }),
    ]

    expect(findDefaultAccount(accounts)).toBeUndefined()
  })
})

describe('isDebtAccount', () => {
  it('returns true for negative balance', () => {
    const account = createMockAccount({ current_balance: -500 })
    expect(isDebtAccount(account)).toBe(true)
  })

  it('returns false for positive balance', () => {
    const account = createMockAccount({ current_balance: 1000 })
    expect(isDebtAccount(account)).toBe(false)
  })

  it('returns false for zero balance', () => {
    const account = createMockAccount({ current_balance: 0 })
    expect(isDebtAccount(account)).toBe(false)
  })
})

describe('formatAccountBalance', () => {
  it('formats UAH currency correctly', () => {
    const account = createMockAccount({ current_balance: 1000, currency: 'UAH' })
    const formatted = formatAccountBalance(account)
    
    // Should contain the amount and currency symbol
    expect(formatted).toContain('1')
    expect(formatted).toContain('000')
  })

  it('handles negative balances', () => {
    const account = createMockAccount({ current_balance: -500, currency: 'UAH' })
    const formatted = formatAccountBalance(account)
    
    // Should contain negative indicator
    expect(formatted).toContain('-')
  })
})

describe('sortAccountsByDate', () => {
  it('sorts accounts by creation date (oldest first)', () => {
    const accounts = [
      createMockAccount({ id: '1', created_at: '2024-03-01T00:00:00Z' }),
      createMockAccount({ id: '2', created_at: '2024-01-01T00:00:00Z' }),
      createMockAccount({ id: '3', created_at: '2024-02-01T00:00:00Z' }),
    ]

    const sorted = sortAccountsByDate(accounts)

    expect(sorted[0].id).toBe('2') // Jan
    expect(sorted[1].id).toBe('3') // Feb
    expect(sorted[2].id).toBe('1') // Mar
  })

  it('does not mutate original array', () => {
    const accounts = [
      createMockAccount({ id: '1', created_at: '2024-03-01T00:00:00Z' }),
      createMockAccount({ id: '2', created_at: '2024-01-01T00:00:00Z' }),
    ]

    const original = [...accounts]
    sortAccountsByDate(accounts)

    expect(accounts).toEqual(original)
  })
})
