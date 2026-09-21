import { describe, it, expect } from 'vitest'
import {
  transactionEffect,
  calculatedBalance,
  gapSeverity,
  reconciliationStatus,
  netWorthSummary,
  groupAccountsByClass,
  creditCardSummary,
} from '@/lib/money/balances'
import { UAH_RATES } from '@/lib/money/fx'
import { makeAccount, makeTxn } from '../_factories'

describe('transactionEffect', () => {
  const asset = makeAccount({ id: 'a', type: 'cash' })
  const liability = makeAccount({ id: 'l', type: 'credit_card' })

  it('credits assets on income and debits on expense', () => {
    expect(transactionEffect(makeTxn({ accountId: 'a', kind: 'income', amount: 100 }), asset)).toBe(100)
    expect(transactionEffect(makeTxn({ accountId: 'a', kind: 'expense', amount: 40 }), asset)).toBe(-40)
  })

  it('treats a credit-card charge (expense) as more debt (negative)', () => {
    // Signed model: spending pushes the balance further negative.
    expect(transactionEffect(makeTxn({ accountId: 'l', kind: 'expense', amount: 60 }), liability)).toBe(-60)
  })

  it('handles transfers on both sides', () => {
    const transfer = makeTxn({ accountId: 'a', counterAccountId: 'l', kind: 'transfer', amount: 30 })
    expect(transactionEffect(transfer, asset)).toBe(-30) // money leaves the asset
    expect(transactionEffect(transfer, liability)).toBe(30) // repayment raises the balance toward zero
  })

  it('ignores unrelated accounts', () => {
    expect(transactionEffect(makeTxn({ accountId: 'x', kind: 'income', amount: 100 }), asset)).toBe(0)
  })
})

describe('calculatedBalance', () => {
  it('sums completed, non-deleted transactions over the opening balance', () => {
    const acc = makeAccount({ id: 'a', type: 'cash', openingBalance: 1000 })
    const txns = [
      makeTxn({ accountId: 'a', kind: 'income', amount: 500 }),
      makeTxn({ accountId: 'a', kind: 'expense', amount: 200 }),
      makeTxn({ accountId: 'a', kind: 'expense', amount: 100, status: 'planned' }), // excluded
      makeTxn({ accountId: 'a', kind: 'income', amount: 999, deletedAt: '2026-06-16T00:00:00Z' }), // excluded
    ]
    expect(calculatedBalance(acc, txns)).toBe(1300)
  })
})

describe('gapSeverity', () => {
  it('classifies gaps relative to the balance', () => {
    expect(gapSeverity(0, 1000)).toBe('none')
    expect(gapSeverity(5, 1000)).toBe('minor') // 0.5%
    expect(gapSeverity(50, 1000)).toBe('moderate') // 5%
    expect(gapSeverity(500, 1000)).toBe('major') // 50%
  })
})

describe('reconciliationStatus', () => {
  it('computes the gap between real and calculated balances', () => {
    const acc = makeAccount({ id: 'a', type: 'cash', openingBalance: 1000, currentBalance: 1280 })
    const txns = [makeTxn({ accountId: 'a', kind: 'income', amount: 300, clearedStatus: 'uncleared' })]
    const status = reconciliationStatus(acc, txns)
    expect(status.calculatedBalance).toBe(1300)
    expect(status.gap).toBe(-20)
    expect(status.unclearedCount).toBe(1)
    expect(status.severity).toBe('minor')
  })
})

describe('netWorthSummary', () => {
  it('subtracts liabilities from assets, converting to the display currency', () => {
    const accounts = [
      makeAccount({ type: 'cash', currency: 'UAH', currentBalance: 1000 }),
      makeAccount({ type: 'savings', currency: 'USD', currentBalance: 100 }),
      makeAccount({ type: 'credit_card', currency: 'UAH', currentBalance: -500 }),
    ]
    const s = netWorthSummary(accounts, 'UAH')
    expect(s.totalAssets).toBeCloseTo(1000 + 100 * UAH_RATES.USD, 4)
    expect(s.totalLiabilities).toBe(500)
    expect(s.netWorth).toBeCloseTo(1000 + 100 * UAH_RATES.USD - 500, 4)
  })

  it('excludes archived accounts', () => {
    const accounts = [
      makeAccount({ type: 'cash', currentBalance: 1000 }),
      makeAccount({ type: 'cash', currentBalance: 9999, archivedAt: '2026-06-01T00:00:00Z' }),
    ]
    expect(netWorthSummary(accounts, 'UAH').totalAssets).toBe(1000)
  })
})

describe('creditCardSummary', () => {
  it('computes used and available when in debt', () => {
    const card = makeAccount({ type: 'credit_card', currentBalance: -12000, creditLimit: 50000 })
    const s = creditCardSummary(card)
    expect(s.used).toBe(12000)
    expect(s.ownFunds).toBe(0)
    expect(s.available).toBe(38000)
    expect(s.utilization).toBeCloseTo(0.24, 4)
  })

  it('handles your own money parked on top of the limit', () => {
    const card = makeAccount({ type: 'credit_card', currentBalance: 5000, creditLimit: 50000 })
    const s = creditCardSummary(card)
    expect(s.used).toBe(0)
    expect(s.ownFunds).toBe(5000)
    expect(s.available).toBe(55000)
    expect(s.utilization).toBe(0)
  })
})

describe('groupAccountsByClass', () => {
  it('splits assets and liabilities', () => {
    const accounts = [makeAccount({ type: 'cash' }), makeAccount({ type: 'mortgage' })]
    const { assets, liabilities } = groupAccountsByClass(accounts)
    expect(assets).toHaveLength(1)
    expect(liabilities).toHaveLength(1)
  })
})