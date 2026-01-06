import { z } from 'zod'

// Transaction type family constraint (Requirement 8.3)
export const transactionTypeFamilySchema = z.enum(['income', 'expense'])

// Base transaction type schema
export const transactionTypeSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  family: transactionTypeFamilySchema,
  description: z.string().max(500, 'Description too long').optional(),
  icon: z.string().max(10, 'Icon too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  is_system: z.boolean().default(false),
  is_default: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

// Schema for creating transaction types (omits server-managed fields)
export const createTransactionTypeSchema = transactionTypeSchema.omit({
  id: true,
  workspace_id: true,
  created_at: true,
  updated_at: true,
}).extend({
  // Ensure family is required for creation (Requirement 8.3)
  family: transactionTypeFamilySchema,
})

// Schema for updating transaction types
export const updateTransactionTypeSchema = createTransactionTypeSchema.partial().extend({
  // Family cannot be changed after creation to maintain data integrity
  family: z.undefined(),
  // System types cannot have their system status changed
  is_system: z.undefined(),
})

// Schema for transaction type reassignment during deletion
export const reassignTransactionTypeSchema = z.object({
  from_type_id: z.string().uuid('Invalid source transaction type ID'),
  to_type_id: z.string().uuid('Invalid target transaction type ID'),
})

// Type exports
export type TransactionType = z.infer<typeof transactionTypeSchema>
export type CreateTransactionTypeInput = z.infer<typeof createTransactionTypeSchema>
export type UpdateTransactionTypeInput = z.infer<typeof updateTransactionTypeSchema>
export type ReassignTransactionTypeInput = z.infer<typeof reassignTransactionTypeSchema>
export type TransactionTypeFamily = z.infer<typeof transactionTypeFamilySchema>