import { faker } from '@faker-js/faker'
import type { Transaction, FullTransaction, Category, Account } from '@/types'

/**
 * Test fixtures for transactions following testing.md patterns
 */

export const mockCategory: Category = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  name: 'Food & Dining',
  color: '#E6A65D',
  icon: 'utensils',
  type: 'expense',
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockAccount: Account = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  name: 'Main Checking',
  type: 'checking',
  balance: 5000,
  currency: 'UAH',
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockTransaction: Transaction = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  account_id: mockAccount.id,
  category_id: mockCategory.id,
  amount: 1000,
  currency: 'UAH',
  description: 'Test transaction',
  type: 'expense',
  transaction_date: new Date().toISOString(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockFullTransaction: FullTransaction = {
  ...mockTransaction,
  category: mockCategory,
  account: mockAccount,
}

/**
 * Creates a mock transaction with optional overrides
 * 
 * @param overrides - Properties to override in the mock transaction
 * @returns Mock transaction with overrides applied
 */
export function createMockTransaction(
  overrides?: Partial<Transaction>
): Transaction {
  return {
    id: faker.string.uuid(),
    workspace_id: faker.string.uuid(),
    account_id: faker.string.uuid(),
    category_id: faker.string.uuid(),
    amount: faker.number.int({ min: 1, max: 10000 }),
    currency: 'UAH',
    description: faker.commerce.productName(),
    type: faker.helpers.arrayElement(['income', 'expense', 'transfer'] as const),
    transaction_date: faker.date.recent().toISOString(),
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  }
}

/**
 * Creates multiple mock transactions
 * 
 * @param count - Number of transactions to create
 * @param overrides - Properties to override in all transactions
 * @returns Array of mock transactions
 */
export function createMockTransactions(
  count: number,
  overrides?: Partial<Transaction>
): Transaction[] {
  return Array.from({ length: count }, () => createMockTransaction(overrides))
}