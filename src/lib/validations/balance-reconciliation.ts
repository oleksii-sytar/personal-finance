import { z } from 'zod'

/**
 * Balance Reconciliation validation schemas
 * Requirements: 12.1, 12.2 from realtime-balance-reconciliation spec
 */

/**
 * Schema for updating current balance
 * Requirements:
 * - 12.1: Validate accountId is UUID
 * - 12.2: Validate newBalance is numeric (allow negative)
 */
export const updateCurrentBalanceSchema = z.object({
  accountId: z
    .string({
      required_error: 'Account ID is required',
      invalid_type_error: 'Account ID must be a string',
    })
    .uuid('Account ID must be a valid UUID'),
  newBalance: z
    .number({
      required_error: 'New balance is required',
      invalid_type_error: 'New balance must be a number',
    })
    .refine((val) => !isNaN(val), {
      message: 'New balance must be a valid number',
    })
    .refine((val) => isFinite(val), {
      message: 'New balance must be a finite number',
    }),
})

/**
 * Schema for getting account difference
 * Validates accountId is UUID
 */
export const getAccountDifferenceSchema = z.object({
  accountId: z
    .string({
      required_error: 'Account ID is required',
      invalid_type_error: 'Account ID must be a string',
    })
    .uuid('Account ID must be a valid UUID'),
})

/**
 * Schema for getting reconciliation status
 * Validates workspaceId is UUID
 */
export const getReconciliationStatusSchema = z.object({
  workspaceId: z
    .string({
      required_error: 'Workspace ID is required',
      invalid_type_error: 'Workspace ID must be a string',
    })
    .uuid('Workspace ID must be a valid UUID'),
})

/**
 * Schema for balance update history filters
 * Requirements: 10.5 - Allow filtering by account and date range
 */
export const balanceUpdateHistoryFiltersSchema = z.object({
  accountId: z
    .string()
    .uuid('Account ID must be a valid UUID')
    .optional(),
  workspaceId: z
    .string()
    .uuid('Workspace ID must be a valid UUID')
    .optional(),
  startDate: z
    .string()
    .datetime('Start date must be a valid ISO date string')
    .optional(),
  endDate: z
    .string()
    .datetime('End date must be a valid ISO date string')
    .optional(),
})
  .refine(
    (data) => data.accountId || data.workspaceId,
    {
      message: 'Either accountId or workspaceId is required',
      path: ['accountId'],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate)
      }
      return true
    },
    {
      message: 'Start date must be before or equal to end date',
      path: ['startDate'],
    }
  )

// Type exports
export type UpdateCurrentBalanceInput = z.infer<typeof updateCurrentBalanceSchema>
export type GetAccountDifferenceInput = z.infer<typeof getAccountDifferenceSchema>
export type GetReconciliationStatusInput = z.infer<typeof getReconciliationStatusSchema>
export type BalanceUpdateHistoryFiltersInput = z.infer<typeof balanceUpdateHistoryFiltersSchema>
