import type { Account, Transaction } from '@/types/domain'

let counter = 0

export function makeAccount(over: Partial<Account> = {}): Account {
  counter += 1
  return {
    id: `acc_${counter}`,
    workspaceId: 'ws',
    name: 'Account',
    type: 'cash',
    currency: 'UAH',
    openingBalance: 0,
    currentBalance: 0,
    currentBalanceUpdatedAt: null,
    isDefault: false,
    institution: null,
    counterparty: null,
    principal: null,
    interestRate: null,
    dueDate: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

export function makeTxn(over: Partial<Transaction> = {}): Transaction {
  counter += 1
  return {
    id: `tx_${counter}`,
    workspaceId: 'ws',
    accountId: 'acc',
    counterAccountId: null,
    categoryId: null,
    transactionTypeId: null,
    kind: 'expense',
    amount: 100,
    currency: 'UAH',
    originalAmount: null,
    originalCurrency: null,
    description: 'Test',
    notes: null,
    transactionDate: '2026-06-15',
    status: 'completed',
    plannedDate: null,
    completedAt: '2026-06-15T00:00:00.000Z',
    clearedStatus: 'cleared',
    isExpected: false,
    recurringTransactionId: null,
    createdBy: 'u',
    createdAt: '2026-06-15T00:00:00.000Z',
    updatedAt: '2026-06-15T00:00:00.000Z',
    deletedAt: null,
    ...over,
  }
}