import type { Tables, TablesInsert, TablesUpdate } from './database'

// Core transaction types from database
export type Transaction = Tables<'transactions'>
export type TransactionInsert = TablesInsert<'transactions'>
export type TransactionUpdate = TablesUpdate<'transactions'>

export type Category = Tables<'categories'>
export type CategoryInsert = TablesInsert<'categories'>
export type CategoryUpdate = TablesUpdate<'categories'>

export type RecurringTransaction = Tables<'recurring_transactions'>
export type RecurringTransactionInsert = TablesInsert<'recurring_transactions'>
export type RecurringTransactionUpdate = TablesUpdate<'recurring_transactions'>

export type ExpectedTransaction = Tables<'expected_transactions'>
export type ExpectedTransactionInsert = TablesInsert<'expected_transactions'>
export type ExpectedTransactionUpdate = TablesUpdate<'expected_transactions'>

// Transaction type management (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
export type TransactionTypeRecord = Tables<'transaction_types'>
export type TransactionTypeInsert = TablesInsert<'transaction_types'>
export type TransactionTypeUpdate = TablesUpdate<'transaction_types'>

// Enums and constants
export type TransactionType = 'income' | 'expense'
export type TransactionTypeFamily = 'income' | 'expense'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ExpectedTransactionStatus = 'pending' | 'confirmed' | 'skipped'
export type TransactionStatus = 'completed' | 'planned'

// Extended types for UI components
export interface TransactionWithCategory extends Transaction {
  category?: Category
}

export interface TransactionWithDetails extends Transaction {
  category?: Category
  transaction_type?: TransactionTypeRecord
  recurring_transaction?: RecurringTransaction
  expected_transaction?: ExpectedTransaction
}

export interface TransactionWithType extends Transaction {
  transaction_type?: TransactionTypeRecord
}

// Filter and pagination types
export interface TransactionFilters {
  dateRange?: {
    start: Date
    end: Date
  }
  categories?: string[]
  type?: 'all' | 'income' | 'expense'
  members?: string[]
  searchQuery?: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface TransactionPage {
  transactions: TransactionWithCategory[]
  totalCount: number
  hasMore: boolean
}

// Form input types
export interface QuickEntryFormData {
  amount: number
  type: TransactionType
  categoryId?: string
  transactionTypeId?: string
  description?: string
}

export interface DetailedEntryFormData extends QuickEntryFormData {
  date: Date
  currency: string
  notes?: string
  isRecurring?: boolean
  recurrencePattern?: RecurrencePattern
}

export interface RecurrencePattern {
  frequency: RecurrenceFrequency
  interval: number
  startDate: Date
  endDate?: Date
}

// Action result type
export type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> }

// Template data for recurring transactions
export interface RecurringTransactionTemplate {
  amount: number
  currency: string
  type: TransactionType
  categoryId?: string
  description?: string
  notes?: string
}

// Date range presets
export type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'custom'

// Currency conversion result
export interface CurrencyConversionResult {
  amount: number
  source: 'live' | 'cached' | 'fallback'
  rate?: number
  date: Date
}