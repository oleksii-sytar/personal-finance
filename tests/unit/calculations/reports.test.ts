import { describe, it, expect } from 'vitest'
import { monthlyTotals, spendingByCategory } from '@/lib/calculations/reports'
import { makeTxn } from '../_factories'
import type { Category } from '@/types/domain'

const now = new Date()
const year = now.getFullYear()
const month0 = now.getMonth()
const day = (d: number) => `${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const categories: Category[] = [
  { id: 'catA', workspaceId: 'ws', name: 'Groceries', color: '#fff', icon: 'x', type: 'expense', isDefault: false },
]

describe('monthlyTotals', () => {
  it('totals completed income and expense for the month', () => {
    const txns = [
      makeTxn({ kind: 'income', amount: 1000, transactionDate: day(15) }),
      makeTxn({ kind: 'expense', amount: 300, transactionDate: day(15) }),
      makeTxn({ kind: 'expense', amount: 200, transactionDate: day(10) }),
      makeTxn({ kind: 'expense', amount: 999, transactionDate: day(15), status: 'planned' }), // excluded
      makeTxn({ kind: 'expense', amount: 50, transactionDate: '2020-01-01' }), // other month
    ]
    const totals = monthlyTotals(txns, year, month0, 'UAH')
    expect(totals.income).toBe(1000)
    expect(totals.expense).toBe(500)
    expect(totals.net).toBe(500)
  })
})

describe('spendingByCategory', () => {
  it('groups expenses by category with percentages, sorted desc', () => {
    const txns = [
      makeTxn({ kind: 'expense', amount: 300, categoryId: 'catA', transactionDate: day(15) }),
      makeTxn({ kind: 'expense', amount: 200, categoryId: null, transactionDate: day(15) }),
      makeTxn({ kind: 'income', amount: 9999, transactionDate: day(15) }), // ignored
    ]
    const rows = spendingByCategory(txns, categories, year, month0, 'UAH')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ name: 'Groceries', total: 300 })
    expect(rows[0].pct).toBeCloseTo(60, 4)
    expect(rows[1]).toMatchObject({ name: 'Без категорії', total: 200 })
    expect(rows[1].pct).toBeCloseTo(40, 4)
  })
})