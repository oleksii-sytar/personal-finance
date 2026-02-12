import { z } from 'zod'

/**
 * Account validation schemas
 * Requirements: 1.2, 1.3, 1.4, 9.1, 9.2, 9.3, 9.4, 9.5
 */

// Account type enum
export const accountTypeEnum = z.enum(['checking', 'savings', 'credit', 'investment'], {
  errorMap: () => ({ message: 'Please select a valid account type' }),
})

// Base account schema (for database operations)
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be 100 characters or less')
    .trim(),
  type: accountTypeEnum,
  balance: z.number().default(0),
  currency: z.string().length(3, 'Invalid currency code').default('UAH'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  initial_balance: z.number().default(0),
  is_default: z.boolean().default(false),
})

// Schema for creating accounts (form submission)
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4
export const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be 100 characters or less')
    .trim(),
  type: accountTypeEnum,
  opening_balance: z
    .coerce
    .number({
      invalid_type_error: 'Opening balance must be a valid number',
    })
    .optional()
    .default(0)
    .refine((val) => !isNaN(val), {
      message: 'Opening balance must be a valid number',
    }),
})

// Schema for updating accounts (name and type only)
// Requirements: 3.2, 3.3, 9.5
export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must be 100 characters or less')
    .trim()
    .optional(),
  type: accountTypeEnum.optional(),
})

// Schema for server-side account creation (includes workspace_id)
export const createAccountSchema = accountFormSchema.extend({
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

// Type exports
export type AccountInput = z.infer<typeof accountSchema>
export type AccountFormInput = z.infer<typeof accountFormSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type AccountType = z.infer<typeof accountTypeEnum>