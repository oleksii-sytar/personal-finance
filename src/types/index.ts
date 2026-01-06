// Re-export action types
export * from './actions'

// Re-export database types
export * from './database'

// Re-export transaction types (avoiding conflicts with actions)
export type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  Category,
  CategoryInsert,
  CategoryUpdate,
  RecurringTransaction,
  RecurringTransactionInsert,
  RecurringTransactionUpdate,
  ExpectedTransaction,
  ExpectedTransactionInsert,
  ExpectedTransactionUpdate,
  TransactionType,
  RecurrenceFrequency,
  ExpectedTransactionStatus,
  TransactionWithCategory,
  TransactionWithDetails,
  TransactionFilters,
  PaginationParams,
  TransactionPage,
  QuickEntryFormData,
  DetailedEntryFormData,
  RecurrencePattern,
  RecurringTransactionTemplate,
  DateRangePreset,
  CurrencyConversionResult,
} from './transactions'

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
export type AccountType = Account['type']
export type BudgetPeriod = Budget['period']