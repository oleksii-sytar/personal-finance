import { z } from 'zod'

// Base transaction schema matching the updated database structure
export const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code').default('UAH'),
  description: z.string().min(1, 'Description is required').max(255),
  notes: z.string().max(1000).optional(),
  category_id: z.string().uuid('Invalid category ID').optional(),
  transaction_date: z.coerce.date(),
  type: z.enum(['income', 'expense']),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  user_id: z.string().uuid('Invalid user ID'),
  created_by: z.string().uuid('Invalid created_by user ID'),
  updated_by: z.string().uuid('Invalid updated_by user ID').optional(),
  
  // Transaction type support (Requirements 8.1, 8.2)
  transaction_type_id: z.string().uuid('Invalid transaction type ID').optional(),
  
  // Foreign currency support
  original_amount: z.number().positive().optional(),
  original_currency: z.string().length(3).optional(),
  
  // Recurring transaction support
  is_expected: z.boolean().default(false),
  expected_transaction_id: z.string().uuid().optional(),
  recurring_transaction_id: z.string().uuid().optional(),
  
  // Soft delete support
  deleted_at: z.coerce.date().optional().nullable(),
})

// Schema for creating transactions (omits server-managed fields)
export const createTransactionSchema = transactionSchema.omit({ 
  workspace_id: true,
  user_id: true,
  created_by: true,
  updated_by: true,
}).extend({
  account_id: z.string().uuid('Invalid account ID').optional(), // Make optional - will use default account if not provided
})

// Schema for updating transactions
export const updateTransactionSchema = createTransactionSchema.partial()

// Quick entry schema (minimal fields for mobile)
export const quickEntrySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().uuid().optional(),
  transaction_type_id: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
})

// Recurring transaction schema
export const recurringTransactionSchema = z.object({
  workspace_id: z.string().uuid('Invalid workspace ID'),
  user_id: z.string().uuid('Invalid user ID'),
  template_data: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3).default('UAH'),
    type: z.enum(['income', 'expense']),
    category_id: z.string().uuid().optional(),
    description: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
  }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval_count: z.number().int().positive().default(1),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional(),
  next_due_date: z.coerce.date(),
  is_active: z.boolean().default(true),
})

// Expected transaction schema
export const expectedTransactionSchema = z.object({
  recurring_transaction_id: z.string().uuid('Invalid recurring transaction ID'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  expected_date: z.coerce.date(),
  expected_amount: z.number().positive(),
  currency: z.string().length(3).default('UAH'),
  status: z.enum(['pending', 'confirmed', 'skipped']).default('pending'),
  actual_transaction_id: z.string().uuid().optional(),
})

// Transaction filters schema
export const transactionFiltersSchema = z.object({
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).optional(),
  categories: z.array(z.string().uuid()).optional(),
  type: z.enum(['all', 'income', 'expense']).optional(),
  members: z.array(z.string().uuid()).optional(),
  searchQuery: z.string().max(255).optional(),
})

// Type exports
export type TransactionInput = z.infer<typeof transactionSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type QuickEntryInput = z.infer<typeof quickEntrySchema>
export type RecurringTransactionInput = z.infer<typeof recurringTransactionSchema>
export type ExpectedTransactionInput = z.infer<typeof expectedTransactionSchema>
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>