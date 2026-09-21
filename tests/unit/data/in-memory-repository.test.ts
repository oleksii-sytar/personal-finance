import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRepository } from '@/lib/data/mock/in-memory-repository'

function futureDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('InMemoryRepository', () => {
  let repo: InMemoryRepository

  beforeEach(() => {
    if (typeof window !== 'undefined') window.localStorage.clear()
    repo = new InMemoryRepository()
  })

  it('seeds a populated family dataset', async () => {
    const accounts = await repo.listAccounts()
    const transactions = await repo.listTransactions()
    expect(accounts.length).toBeGreaterThan(0)
    expect(accounts.some((a) => a.isDefault)).toBe(true)
    expect(transactions.length).toBeGreaterThan(0)
  })

  it('creates a transaction', async () => {
    const accounts = await repo.listAccounts()
    const def = accounts.find((a) => a.isDefault)!
    const before = (await repo.listTransactions()).length
    const created = await repo.createTransaction({
      accountId: def.id,
      kind: 'expense',
      amount: 123,
      currency: def.currency,
      description: 'Coffee',
      transactionDate: new Date().toISOString().slice(0, 10),
    })
    expect(created.id).toBeTruthy()
    expect(created.status).toBe('completed')
    expect((await repo.listTransactions()).length).toBe(before + 1)
  })

  it('soft-deletes and can include deleted', async () => {
    const accounts = await repo.listAccounts()
    const t = await repo.createTransaction({
      accountId: accounts[0].id,
      kind: 'expense',
      amount: 10,
      currency: accounts[0].currency,
      description: 'X',
      transactionDate: new Date().toISOString().slice(0, 10),
    })
    await repo.softDeleteTransaction(t.id)
    const active = await repo.listTransactions()
    const all = await repo.listTransactions({ includeDeleted: true })
    expect(active.find((x) => x.id === t.id)).toBeUndefined()
    expect(all.find((x) => x.id === t.id)).toBeDefined()
  })

  it('reconciles an account and records history', async () => {
    const accounts = await repo.listAccounts()
    const acc = accounts[0]
    const updated = await repo.reconcileAccount(acc.id, acc.currentBalance + 500, 'found cash')
    expect(updated.currentBalance).toBe(acc.currentBalance + 500)
    const history = await repo.listBalanceHistory(acc.id)
    expect(history).toHaveLength(1)
    expect(history[0].difference).toBe(500)
  })

  it('does not make a second account the default', async () => {
    const created = await repo.createAccount({
      name: 'New wallet',
      type: 'cash',
      currency: 'UAH',
      openingBalance: 0,
    })
    expect(created.isDefault).toBe(false)
  })

  it('completes a planned transaction', async () => {
    const accounts = await repo.listAccounts()
    const planned = await repo.createTransaction({
      accountId: accounts[0].id,
      kind: 'expense',
      amount: 80,
      currency: accounts[0].currency,
      description: 'Future bill',
      transactionDate: futureDate(10),
      plannedDate: futureDate(10),
    })
    expect(planned.status).toBe('planned')
    const done = await repo.completeTransaction(planned.id)
    expect(done.status).toBe('completed')
    expect(done.plannedDate).toBeNull()
  })
})