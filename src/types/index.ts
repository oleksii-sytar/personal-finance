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

/**
 * Account type enum for financial accounts
 */
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment'

/**
 * Account interface representing a financial account in the system
 */
export interface Account {
  id: string                    // UUID primary key
  workspace_id: string          // FK to workspaces table
  name: string                  // Account name (max 100 chars)
  type: AccountType             // Account type enum
  opening_balance: number       // Opening balance (immutable after creation)
  current_balance: number       // Current balance (manually updated during reconciliation)
  current_balance_updated_at: string | null  // Timestamp of last balance update
  currency: string              // ISO 4217 currency code (inherited from workspace)
  is_default: boolean           // Whether this is the default account
  created_at: string            // ISO timestamp
  updated_at: string            // ISO timestamp
}

/**
 * Form data for creating a new account
 */
export interface CreateAccountFormData {
  name: string
  type: AccountType
  opening_balance?: number
}

/**
 * Form data for updating an existing account
 */
export interface UpdateAccountFormData {
  name: string
  type: AccountType
}

/**
 * Account with transaction count (used for deletion validation)
 */
export interface AccountWithTransactionCount extends Account {
  transaction_count: number
}

/**
 * Account summary statistics for dashboard display
 */
export interface AccountSummary {
  total_balance: number
  account_counts: Record<AccountType, number>
  debt_accounts: Account[]
  total_accounts: number
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
export type BudgetPeriod = Budget['period']