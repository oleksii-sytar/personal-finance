import { z } from 'zod'

export const transactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Invalid currency code').default('UAH'),
  description: z.string().min(1, 'Description is required').max(255),
  category_id: z.string().uuid('Invalid category ID'),
  account_id: z.string().uuid('Invalid account ID'),
  transaction_date: z.coerce.date(),
  type: z.enum(['income', 'expense', 'transfer']),
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

export const createTransactionSchema = transactionSchema.omit({ 
  workspace_id: true 
})

export const updateTransactionSchema = transactionSchema.partial()

export type TransactionInput = z.infer<typeof transactionSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>