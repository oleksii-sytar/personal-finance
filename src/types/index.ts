// Re-export action types
export * from './actions'

/**
 * Core domain types following structure.md and code-quality.md standards
 */

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  currency: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  workspace_id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  workspace_id: string
  name: string
  color: string
  icon: string
  type: 'income' | 'expense'
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  workspace_id: string
  account_id: string
  category_id: string
  amount: number
  currency: string
  description: string
  type: 'income' | 'expense' | 'transfer'
  transaction_date: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  workspace_id: string
  name: string
  category_id: string
  amount: number
  period: 'monthly' | 'weekly' | 'yearly'
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

/**
 * Derived types for better type safety
 */
export type TransactionType = Transaction['type']
export type AccountType = Account['type']
export type CategoryType = Category['type']
export type BudgetPeriod = Budget['period']

/**
 * Composite types for complex operations
 */
export type TransactionWithCategory = Transaction & {
  category: Category
}

export type TransactionWithAccount = Transaction & {
  account: Account
}

export type FullTransaction = Transaction & {
  category: Category
  account: Account
}