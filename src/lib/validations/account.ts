import { z } from 'zod'

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  balance: z.number().default(0),
  currency: z.string().length(3, 'Invalid currency code').default('UAH'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

export const createAccountSchema = accountSchema.omit({ 
  workspace_id: true 
})

export const updateAccountSchema = accountSchema.partial()

export type AccountInput = z.infer<typeof accountSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>