import { faker } from '@faker-js/faker'
import type { Transaction, TransactionWithCategory, Category, Account } from '@/types'
import { createMockCategory } from './categories'

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
  is_default: false,
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockAccount: Account = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  name: 'Main Checking',
  type: 'checking',
  opening_balance: 5000,
  current_balance: 5000,
  current_balance_updated_at: faker.date.recent().toISOString(),
  currency: 'UAH',
  is_default: true,
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
}

export const mockTransaction: Transaction = {
  id: faker.string.uuid(),
  workspace_id: faker.string.uuid(),
  user_id: faker.string.uuid(),
  account_id: mockAccount.id,
  category_id: mockCategory.id,
  amount: 1000,
  currency: 'UAH',
  description: 'Test transaction',
  notes: null,
  type: 'expense',
  transaction_type_id: faker.string.uuid(),
  transaction_date: new Date().toISOString().split('T')[0], // Date only
  status: 'completed',
  planned_date: null,
  completed_at: faker.date.recent().toISOString(),
  is_expected: false,
  expected_transaction_id: null,
  recurring_transaction_id: null,
  locked: false,
  original_amount: null,
  original_currency: null,
  created_by: faker.string.uuid(),
  updated_by: null,
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  deleted_at: null,
}

export const mockTransactionWithCategory: TransactionWithCategory = {
  ...mockTransaction,
  category: mockCategory,
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
    user_id: faker.string.uuid(),
    account_id: faker.string.uuid(),
    category_id: faker.string.uuid(),
    amount: faker.number.int({ min: 1, max: 10000 }),
    currency: 'UAH',
    description: faker.commerce.productName(),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
    type: faker.helpers.arrayElement(['income', 'expense'] as const),
    transaction_type_id: faker.string.uuid(),
    transaction_date: faker.date.recent().toISOString().split('T')[0], // Date only
    status: 'completed',
    planned_date: null,
    completed_at: faker.date.recent().toISOString(),
    is_expected: false,
    expected_transaction_id: null,
    recurring_transaction_id: null,
    locked: false,
    original_amount: null,
    original_currency: null,
    created_by: faker.string.uuid(),
    updated_by: null,
    created_at: faker.date.recent().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    deleted_at: null,
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

/**
 * Creates a mock transaction with category
 * 
 * @param overrides - Properties to override in the mock transaction
 * @param categoryOverrides - Properties to override in the mock category
 * @returns Mock transaction with category
 */
export function createMockTransactionWithCategory(
  overrides?: Partial<Transaction>,
  categoryOverrides?: Partial<Category>
): TransactionWithCategory {
  const category = createMockCategory(categoryOverrides)
  const transaction = createMockTransaction({
    category_id: category.id,
    ...overrides,
  })
  
  return {
    ...transaction,
    category,
  }
}

/**
 * Creates multiple mock transactions with categories
 * 
 * @param count - Number of transactions to create
 * @param overrides - Properties to override in all transactions
 * @param categoryOverrides - Properties to override in all categories
 * @returns Array of mock transactions with categories
 */
export function createMockTransactionsWithCategories(
  count: number,
  overrides?: Partial<Transaction>,
  categoryOverrides?: Partial<Category>
): TransactionWithCategory[] {
  return Array.from({ length: count }, () => 
    createMockTransactionWithCategory(overrides, categoryOverrides)
  )
}